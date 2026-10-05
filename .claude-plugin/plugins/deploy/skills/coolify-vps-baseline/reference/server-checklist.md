# Server checklist

Confirm each line read-only first. Lines marked *owner* change system state and are run by the owner from exact commands you supply.

## Access

| Check | Command | Expect |
| --- | --- | --- |
| Root login disabled, password login disabled | `sudo sshd -T \| grep -E 'permitrootlogin\|passwordauthentication'` | both `no` |
| Deploy user has passwordless sudo | `sudo -n true && echo ok` | `ok` |
| SSH alias works with a key | `ssh <alias> true` | silent success |

## Network

| Check | Command | Expect |
| --- | --- | --- |
| Firewall active, 22 limited, 80 and 443 open, nothing else | `sudo ufw status numbered` | `22/tcp LIMIT`, `80,443/tcp ALLOW`, no app ports |
| Docker respects the firewall | `sudo iptables -L DOCKER-USER -n` | rules that drop inbound to containers except 80 and 443 |
| No container publishes a host port besides the proxy | `sudo docker ps --format '{{.Names}} {{.Ports}}'` | only `coolify-proxy` shows `0.0.0.0:80` and `:443` |
| fail2ban watches sshd | `sudo fail2ban-client status sshd` | a running jail |
| Public address resolves as expected | `curl -s https://api.ipify.org` from the server | the address in DNS |

## Capacity

| Check | Command | Expect |
| --- | --- | --- |
| Free memory | `free -h` | several GB available after everything that runs |
| Disk | `df -h /` | under 70 percent used, with room for image layers and backups |
| Per-container memory | `sudo docker stats --no-stream` | every app under its limit |
| Pending reboot | `[ -f /var/run/reboot-required ] && echo reboot` | nothing |

## Coolify

| Check | Command | Expect |
| --- | --- | --- |
| Coolify containers | `sudo docker ps --filter name=coolify --format '{{.Names}} {{.Status}}'` | `coolify`, `coolify-db`, `coolify-redis`, `coolify-realtime`, `coolify-proxy` all up |
| Proxy certificate resolver | `sudo docker inspect coolify-proxy --format '{{json .Args}}' \| tr ',' '\n' \| grep -i acme` | an ACME resolver with HTTP challenge |
| Dynamic proxy config present | `sudo ls /data/coolify/proxy/dynamic/` | Coolify's own files; nothing hand-edited |
| Registry login for private images | `sudo docker pull ghcr.io/<owner>/<repo>:main` | pulls (after the owner logs in once) |

## Time and updates

| Check | Command | Expect |
| --- | --- | --- |
| Clock synced | `timedatectl \| grep synchronized` | `yes` |
| Unattended security updates | `cat /etc/apt/apt.conf.d/20auto-upgrades` | enabled |

## Owner-only actions (give the exact command, never run it)

- Opening or limiting a firewall port: `sudo ufw limit 22/tcp`, `sudo ufw allow 80,443/tcp`.
- Registry login: `sudo docker login ghcr.io -u <github-user>` with a `read:packages` token.
- Any change under `/etc/ssh`, `/etc/fail2ban`, or the proxy configuration.
