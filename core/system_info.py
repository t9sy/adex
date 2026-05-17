"""
System-Monitor-Modul.
Liest CPU, RAM, Festplatten-Auslastung und Prozesse via psutil.
"""

import psutil
import platform
from datetime import datetime
from typing import Optional


class SystemMonitor:
    """System-Informationen und Prozess-Verwaltung."""

    def get_system_overview(self) -> dict:
        """Umfassende Systemübersicht abrufen."""
        return {
            "cpu": self.get_cpu_info(),
            "memory": self.get_memory_info(),
            "disk": self.get_disk_info(),
            "network": self.get_network_info(),
            "system": self.get_platform_info(),
            "uptime": self.get_uptime(),
        }

    def get_cpu_info(self) -> dict:
        """CPU-Auslastung und Details abrufen."""
        cpu_freq = psutil.cpu_freq()
        return {
            "percent": psutil.cpu_percent(interval=1),
            "percent_per_core": psutil.cpu_percent(interval=0, percpu=True),
            "cores_physical": psutil.cpu_count(logical=False),
            "cores_logical": psutil.cpu_count(logical=True),
            "frequency_mhz": round(cpu_freq.current, 0) if cpu_freq else 0,
            "frequency_max_mhz": round(cpu_freq.max, 0) if cpu_freq else 0,
        }

    def get_memory_info(self) -> dict:
        """RAM-Auslastung abrufen."""
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "percent": mem.percent,
            "swap_total_gb": round(swap.total / (1024**3), 2),
            "swap_used_gb": round(swap.used / (1024**3), 2),
            "swap_percent": swap.percent,
        }

    def get_disk_info(self) -> list[dict]:
        """Festplatten-Auslastung für alle Partitionen."""
        disks = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total_gb": round(usage.total / (1024**3), 2),
                    "used_gb": round(usage.used / (1024**3), 2),
                    "free_gb": round(usage.free / (1024**3), 2),
                    "percent": usage.percent,
                })
            except (PermissionError, OSError):
                continue
        return disks

    def get_network_info(self) -> dict:
        """Netzwerk-Statistiken abrufen."""
        net_io = psutil.net_io_counters()
        return {
            "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 2),
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
        }

    def get_temperatures(self) -> dict:
        """CPU-Temperaturen abrufen (falls verfügbar)."""
        try:
            temps = psutil.sensors_temperatures()
            if not temps:
                return {"available": False, "message": "Keine Temperatursensoren gefunden."}

            result = {"available": True, "sensors": {}}
            for name, entries in temps.items():
                result["sensors"][name] = [
                    {
                        "label": entry.label or "Unbekannt",
                        "current": entry.current,
                        "high": entry.high,
                        "critical": entry.critical,
                    }
                    for entry in entries
                ]
            return result
        except AttributeError:
            return {"available": False, "message": "Temperatursensoren auf diesem System nicht unterstützt."}

    def get_platform_info(self) -> dict:
        """Plattform-Informationen abrufen."""
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
        }

    def get_uptime(self) -> str:
        """System-Laufzeit berechnen."""
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        hours, remainder = divmod(int(uptime.total_seconds()), 3600)
        minutes, seconds = divmod(remainder, 60)
        days = hours // 24
        hours = hours % 24
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        return f"{hours}h {minutes}m {seconds}s"

    def get_processes(self, sort_by: str = "memory", limit: int = 20) -> list[dict]:
        """
        Laufende Prozesse abrufen und sortieren.
        sort_by: 'memory', 'cpu', 'name', 'pid'
        """
        processes = []
        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "status"]):
            try:
                info = proc.info
                processes.append({
                    "pid": info["pid"],
                    "name": info["name"],
                    "cpu_percent": round(info["cpu_percent"] or 0, 1),
                    "memory_percent": round(info["memory_percent"] or 0, 1),
                    "status": info["status"],
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # Sortieren
        sort_keys = {
            "memory": lambda p: p["memory_percent"],
            "cpu": lambda p: p["cpu_percent"],
            "name": lambda p: p["name"].lower(),
            "pid": lambda p: p["pid"],
        }
        key_func = sort_keys.get(sort_by, sort_keys["memory"])
        processes.sort(key=key_func, reverse=(sort_by in ("memory", "cpu")))

        return processes[:limit]

    def kill_process(self, pid: int) -> dict:
        """Prozess anhand der PID beenden."""
        try:
            proc = psutil.Process(pid)
            name = proc.name()
            proc.terminate()
            proc.wait(timeout=5)
            return {"success": True, "message": f"Prozess '{name}' (PID {pid}) wurde beendet."}
        except psutil.NoSuchProcess:
            return {"success": False, "message": f"Prozess mit PID {pid} existiert nicht."}
        except psutil.AccessDenied:
            return {"success": False, "message": f"Keine Berechtigung, Prozess {pid} zu beenden."}
        except psutil.TimeoutExpired:
            try:
                proc.kill()
                return {"success": True, "message": f"Prozess {pid} wurde erzwungen beendet (kill)."}
            except Exception as e:
                return {"success": False, "message": f"Konnte Prozess {pid} nicht beenden: {e}"}

    def format_overview(self) -> str:
        """System-Übersicht als formatierten Text zurückgeben."""
        info = self.get_system_overview()
        cpu = info["cpu"]
        mem = info["memory"]
        disks = info["disk"]
        net = info["network"]
        sys_info = info["system"]

        parts = [
            f"## 💻 System-Monitor",
            f"**{sys_info['system']} {sys_info['release']}** | Laufzeit: {info['uptime']}",
            "",
            f"### CPU",
            f"Auslastung: **{cpu['percent']}%** | "
            f"Kerne: {cpu['cores_physical']}P/{cpu['cores_logical']}L | "
            f"Frequenz: {cpu['frequency_mhz']} MHz",
            "",
            f"### Arbeitsspeicher",
            f"Belegt: **{mem['used_gb']} GB** / {mem['total_gb']} GB ({mem['percent']}%)",
            f"Verfügbar: {mem['available_gb']} GB",
        ]

        if disks:
            parts.append("")
            parts.append("### Festplatten")
            for disk in disks:
                parts.append(
                    f"**{disk['device']}** ({disk['mountpoint']}): "
                    f"{disk['used_gb']} GB / {disk['total_gb']} GB ({disk['percent']}%)"
                )

        parts.append("")
        parts.append("### Netzwerk")
        parts.append(f"↑ {net['bytes_sent_mb']} MB | ↓ {net['bytes_recv_mb']} MB")

        return "\n".join(parts)

    def format_processes(self, sort_by: str = "memory", limit: int = 15) -> str:
        """Prozessliste als formatierten Text zurückgeben."""
        processes = self.get_processes(sort_by, limit)
        if not processes:
            return "Keine Prozesse gefunden."

        parts = [
            "## Laufende Prozesse",
            f"| PID | Name | CPU% | RAM% | Status |",
            f"|-----|------|------|------|--------|",
        ]
        for p in processes:
            parts.append(
                f"| {p['pid']} | {p['name'][:30]} | {p['cpu_percent']} | "
                f"{p['memory_percent']} | {p['status']} |"
            )

        return "\n".join(parts)
