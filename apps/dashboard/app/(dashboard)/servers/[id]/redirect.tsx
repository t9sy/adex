import { redirect } from 'next/navigation';

export default function ServerRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard/servers/${params.id}`);
}
