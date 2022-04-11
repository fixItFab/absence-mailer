FROM node:17.5.0-alpine AS builder

RUN  apk update && apk add bash && rm -rf /var/cache/apk/*

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

RUN  apk update && apk add tzdata && rm -rf /var/cache/apk/*

WORKDIR /app

# copy from build image
COPY --from=builder /app/dist .
COPY --from=builder /app/node_modules ./node_modules

ENV ABSENCE_ID= \
    ABSENCE_KEY=  \
    SMTP_HOST= \
    SMTP_PORT=58= \
    SMTP_AUTH_USER= \
    SMTP_AUTH_PASS= \
    MAIL_FROM= \
    MAIL_TO= \
    CRON_EXPRESSION= 

CMD ["node", "main.js"]