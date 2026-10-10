# Reviewed AMD64 worker release; update only after its CI and registry checks pass.
FROM ghcr.io/chaitanyareddykarri/ryvix-micro-workers@sha256:2bd18b9828754b1af983da3c0e9f2d7e3c3b6b0f8b9794ffc1876c331f17d6cb
USER root
RUN apk add --no-cache su-exec
COPY infrastructure/railway/entrypoint.sh /usr/local/bin/ryvix-railway
RUN sed -i 's/\r$//' /usr/local/bin/ryvix-railway && chmod 755 /usr/local/bin/ryvix-railway
ENTRYPOINT ["/usr/local/bin/ryvix-railway"]
CMD ["operations"]
