import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type GuildMember,
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import { getGuildLanguage, getGuildSettings } from '../../utils/guild.js';
import { replySuccess, replyError, infoEmbed } from '../../utils/embeds.js';
import { t } from '../../utils/i18n.js';
import type { BotCommand } from '../../utils/types.js';

interface QueueItem {
  title: string;
  url: string;
}

interface GuildQueue {
  connection: VoiceConnection;
  player: AudioPlayer;
  songs: QueueItem[];
  volume: number;
  playing: boolean;
}

const queues = new Map<string, GuildQueue>();

/** Gets or creates a queue for a guild. */
export function getQueue(guildId: string): GuildQueue | undefined {
  return queues.get(guildId);
}

/** Deletes a queue for a guild. */
export function deleteQueue(guildId: string): void {
  queues.delete(guildId);
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from a URL or search term')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('URL or search term').setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    if (!interaction.guild) return;
    await interaction.deferReply();

    const lang = await getGuildLanguage(interaction.guild.id);
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
      await replyError(interaction, 'Error', t(lang, 'music.not_in_voice'));
      return;
    }

    const settings = await getGuildSettings(interaction.guild.id);
    if (
      settings.music.djRoleId &&
      !member.roles.cache.has(settings.music.djRoleId) &&
      !member.permissions.has('ManageGuild')
    ) {
      await replyError(interaction, 'Error', 'You need the DJ role to use music commands.');
      return;
    }

    const query = interaction.options.getString('query', true);

    try {
      const playDl = await import('play-dl');
      let info: { title: string; url: string };

      if (playDl.yt_validate(query) === 'video') {
        const videoInfo = await playDl.video_basic_info(query);
        info = { title: videoInfo.video_details.title ?? 'Unknown', url: query };
      } else {
        const searched = await playDl.search(query, { limit: 1 });
        if (searched.length === 0) {
          await replyError(interaction, 'Error', t(lang, 'music.no_results'));
          return;
        }
        const first = searched[0]!;
        info = { title: first.title ?? 'Unknown', url: first.url };
      }

      let guildQueue = queues.get(interaction.guild.id);

      if (!guildQueue) {
        const connection = joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: interaction.guild.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          adapterCreator: interaction.guild.voiceAdapterCreator as any,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        guildQueue = {
          connection,
          player,
          songs: [],
          volume: settings.music.defaultVolume,
          playing: false,
        };

        queues.set(interaction.guild.id, guildQueue);

        player.on(AudioPlayerStatus.Idle, () => {
          const q = queues.get(interaction.guild!.id);
          if (q) {
            q.songs.shift();
            if (q.songs.length > 0) {
              playSong(interaction.guild!.id);
            } else {
              q.connection.destroy();
              queues.delete(interaction.guild!.id);
            }
          }
        });
      }

      guildQueue.songs.push(info);

      if (!guildQueue.playing) {
        await playSong(interaction.guild.id);
        await replySuccess(interaction, 'Music', t(lang, 'music.play', { title: info.title }));
      } else {
        const embed = infoEmbed('Queue', t(lang, 'music.queue.add', { title: info.title }));
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('[Music]', error);
      await replyError(interaction, 'Error', t(lang, 'music.no_results'));
    }
  },
};

/** Plays the first song in the guild's queue. */
async function playSong(guildId: string): Promise<void> {
  const guildQueue = queues.get(guildId);
  if (!guildQueue || guildQueue.songs.length === 0) return;

  const song = guildQueue.songs[0]!;

  try {
    const playDl = await import('play-dl');
    const stream = await playDl.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    guildQueue.player.play(resource);
    guildQueue.playing = true;
  } catch (error) {
    console.error('[Music] Play error:', error);
    guildQueue.songs.shift();
    if (guildQueue.songs.length > 0) {
      await playSong(guildId);
    }
  }
}

export default command;
