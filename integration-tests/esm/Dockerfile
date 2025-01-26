FROM node:22-alpine AS build

WORKDIR /src
ADD . /src
RUN /bin/sh -c "tar zxf \"$(npm pack --ignore-scripts)\""

FROM node:22-alpine
WORKDIR /src
ADD integration-tests/esm /src
COPY --from=build /src/package /src/node_modules/simple-token-bucket
CMD [ "node", "index.js" ]