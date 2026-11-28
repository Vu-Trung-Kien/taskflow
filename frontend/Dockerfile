FROM caddy:2.11.9-builder-alpine AS caddy-build
WORKDIR /src

# Keep the standard Caddy modules and upgrade x/net for CVE-2026-78661.
RUN --mount=type=secret,id=build_ca,target=/run/secrets/build_ca \
    if [ -f /run/secrets/build_ca ]; then export SSL_CERT_FILE=/run/secrets/build_ca; fi \
    && go mod init taskflow-caddy \
    && go get github.com/caddyserver/caddy/v2/cmd/caddy@v2.11.9 golang.org/x/net@v0.62.0 \
    && CGO_ENABLED=0 go build -trimpath -o /usr/bin/caddy github.com/caddyserver/caddy/v2/cmd/caddy

FROM caddy:2.11.9-alpine
COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist /srv
