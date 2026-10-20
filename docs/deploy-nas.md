# Deploying Spielzeugkiste on a Synology NAS

The NAS runs the image that CI publishes to the GitHub Container Registry,
`ghcr.io/frankandreas/spielzeugkiste:latest`, whenever a change lands on `master` and the tests
pass. The repository is public, so no registry login is needed.

The app is static: nginx serves the built games. It keeps no data, so there is nothing to back up
and no `.env` to set up. It runs next to the other family apps (8080–8083) on port **8084**, for
the home network only.

## Prerequisites
- A Synology NAS with **Container Manager** installed.
- SSH access to the NAS (**Control Panel → Terminal & SNMP → Enable SSH**).

## Installation

1. **Prepare the folder.** Create the app folder (e.g. `/volume1/docker/spielzeugkiste`) and upload
   `docker-compose.yml` into it **renamed to `compose.yaml`**. Remove the `build: .` line, since
   the NAS has no source code to build from. Change the port in it if 8084 is taken.
2. **Start** it over SSH:
   ```bash
   cd /volume1/docker/spielzeugkiste
   sudo docker-compose up -d
   ```
   or create a Container Manager **Project** on this folder ("Create project with existing
   docker-compose.yml").
3. Open `http://<NAS_IP>:8084` on the iPad. Tip: in Safari, **Share → Add to Home Screen** gives the
   kids an app icon.

## Updates
Set up [automatic updates](#automatic-updates) to install new versions nightly, or update by hand:

```bash
sudo docker-compose pull
sudo docker-compose up -d
```

## Automatic updates

`scripts/nas-update.sh` checks for a new image and installs it. Run nightly by DSM's Task Scheduler, it:

1. pulls the image; if nothing is new, it only checks that the app is healthy and stops,
2. keeps the running image tagged as `:previous` for [rolling back](#rolling-back-an-update),
3. restarts the app and waits until it is healthy, logging to `logs/update.log`.

It finds the compose file by its usual names (`compose.yaml`, `docker-compose.yml`, ...) and never
changes it. It also removes dangling (untagged) Docker images to save space, including those of
other projects on the NAS.

### Setup
1. Copy `scripts/nas-update.sh` into the app folder (next to the compose file) and make it executable:
   ```bash
   sudo chmod +x /volume1/docker/spielzeugkiste/nas-update.sh
   ```
2. Run it once by hand and check that it ends with "Up to date" or "Update complete":
   ```bash
   sudo /volume1/docker/spielzeugkiste/nas-update.sh
   ```
3. In DSM, open **Control Panel → Task Scheduler → Create → Scheduled Task → User-defined script**:
   - **General**: any name (e.g. `Spielzeugkiste update`), user **root**
   - **Schedule**: daily, at a quiet time (e.g. 03:50)
   - **Task Settings**: tick **Send run details by email** and **only when the script terminates
     abnormally**, and enter the command:
     ```bash
     bash /volume1/docker/spielzeugkiste/nas-update.sh
     ```

### Rolling back an update
If a new version misbehaves, go back to the previous one. First **disable the scheduled task**,
otherwise the next night installs the same version again. Then, in the app folder:

```bash
cd /volume1/docker/spielzeugkiste
sudo docker tag ghcr.io/frankandreas/spielzeugkiste:previous ghcr.io/frankandreas/spielzeugkiste:latest
sudo docker-compose up -d
```

Re-enable the task once a fixed version is published.

### Deploying from your computer
To install the latest version right away, or to roll out a new version of `nas-update.sh`, run from
a checkout of this repository:

```bash
cp .deploy.env.example .deploy.env   # once; then set NAS_HOST and NAS_DIR in it
scripts/deploy-nas.sh
```

It shows how the NAS's `nas-update.sh` differs from the repository's, uploads it after you confirm,
and runs the update. Add `--force` to restart the app even without a new version, e.g. after editing
the compose file on the NAS. The compose file belongs to your deployment and is never copied.

- Connect once by hand (`ssh user@<NAS_IP>`) to verify and accept the NAS's host key; the script
  never accepts unknown keys.
- **Password:** without further setup, ssh and sudo ask for it. To avoid typing it, set
  `NAS_PASS_CMD` in `.deploy.env` to a command that prints it, e.g. `NAS_PASS_CMD=pass show nas`. The
  password is piped straight to ssh and `sudo` and never stored, shown or logged.
- `.deploy.env` is gitignored, so your NAS address stays out of the repository.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker pull` fails with *denied* or *unauthorized* | The image on GHCR is private | On GitHub, **Packages → spielzeugkiste → Package settings → Change visibility → Public** |
| *Bind for 0.0.0.0:8084 failed: port is already allocated* | Another app uses 8084 | Change the port in `compose.yaml` and run `sudo docker-compose up -d` |
| The iPad shows an old version after an update | Safari cached the page | Reload the page, or remove and re-add the home-screen icon |
| Email from Task Scheduler: *app not healthy* | A new version fails to start | Check `logs/update.log` (it ends with the app's log), then [roll back](#rolling-back-an-update) |

## Handwriting traces

The handwriting game (Schreiben) posts every try with the pen to `/api/traces`:
all touches with position, contact size and pressure, and whether they were
taken as the pen. nginx appends each post as one JSON line inside the
container, for tuning the pen and palm detection.

Copy them off the NAS:

```bash
ssh <user>@<nas> "sudo docker exec spielzeugkiste cat /var/log/traces/traces.jsonl" > traces.jsonl
```

The file lives in the container only, so it is gone after the next image
update. To keep it across updates, add a volume to `compose.yaml` on the NAS:

```yaml
    volumes:
      - ./traces:/var/log/traces
```

Locally, `npm run dev` writes the same lines to `traces/traces.jsonl`
(git-ignored). Add `?debug` to the game's URL (`#/schreiben/play?debug`) to
see every touch and why it was taken or ignored.
