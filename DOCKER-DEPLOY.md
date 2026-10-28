# Docker deployment

Run the app with Docker Compose so uploads stay in the named `project-tracker-uploads` volume when the app container is replaced.

Set these variables on the server before starting Compose:

- `APP_DB_CONNECTION`: PostgreSQL connection string for the live database.
- `JWT_KEY`: a private signing key of at least 32 characters.
- `APP_PORT` (optional): public host port; defaults to `8080`.

Deploy or update the app with:

```sh
docker compose up -d --build
```

Do not use `docker compose down -v` or delete the `project-tracker-uploads` Docker volume; either action deletes saved files. `docker compose down` without `-v` keeps the volume for the next deployment.

If uploads still exist in an old container, copy `/app/uploads` out of it before removing that container, then copy those files into the `project-tracker-uploads` volume. This initial copy is needed once; future deployments using this Compose file reuse the volume automatically.
