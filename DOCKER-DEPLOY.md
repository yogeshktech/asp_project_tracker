# Docker deployment

Run the app with Docker Compose so uploads stay in the named `project-tracker-uploads` volume when the app container is replaced.

Set these variables on the server before starting Compose. For a single-server setup, copy `.env.example` to `.env`, then fill in the real values. `.env` is git-ignored; never commit it.

- `APP_DB_CONNECTION`: PostgreSQL connection string for the live database.
- `JWT_KEY`: a private signing key of at least 32 characters.
- `APP_PORT` (optional): public host port; defaults to `8080`.
- `DO_SPACES_ACCESS_KEY` and `DO_SPACES_SECRET_KEY`: DigitalOcean Spaces keys.
- `DO_SPACES_BUCKET`: bucket name; defaults to `mytrackwize` and can be changed later.
- `DO_SPACES_REGION` and `DO_SPACES_SERVICE_URL`: Spaces region and regional endpoint.

Deploy or update the app with:

```sh
docker compose up -d --build
```

Uploads are written to Spaces when both Spaces keys are present. Local development without those keys continues to use the local `uploads` directory. Existing uploads already on a server are not moved automatically; copy them to the configured Space before switching if they need to remain accessible.

Do not use `docker compose down -v` or delete the `project-tracker-uploads` Docker volume; either action deletes saved files. `docker compose down` without `-v` keeps the volume for the next deployment.

If uploads still exist in an old container, copy `/app/uploads` out of it before removing that container, then copy those files into the `project-tracker-uploads` volume. This initial copy is needed once; future deployments using this Compose file reuse the volume automatically.
