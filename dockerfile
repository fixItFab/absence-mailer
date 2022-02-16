FROM node:17.5.0-alpine AS builder

RUN  apk update && apk add curl bash && rm -rf /var/cache/apk/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install 

COPY . .

RUN npm run build 

 # remove development dependencies
RUN npm prune --production && \
    npx node-prune

################################################

FROM node:17.5.0-alpine

WORKDIR /app

# copy from build image
COPY --from=builder /app/dist .
COPY --from=builder /app/node_modules ./node_modules

ENV ABSENCE_ID=
ENV ABSENCE_KEY=
ENV SMTP_HOST=
ENV SMTP_PORT=587
ENV SMTP_AUTH_USER=
ENV SMTP_AUTH_PASS=
ENV MAIL_FROM=
ENV MAIL_TO=

COPY crontab /etc/crontabs/root
CMD ["crond", "-l", "2", "-f"]