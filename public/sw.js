self.addEventListener("push", (event) => {
  let gegevens = {};

  try {
    gegevens = event.data
      ? event.data.json()
      : {};
  } catch {
    gegevens = {
      body: event.data
        ? event.data.text()
        : "",
    };
  }

  const titel =
    typeof gegevens.title === "string"
      ? gegevens.title
      : "SKH Certificaten CRM";

  const opties = {
    body:
      typeof gegevens.body === "string"
        ? gegevens.body
        : "Er is een nieuwe melding.",
    data: {
      url:
        typeof gegevens.url === "string"
          ? gegevens.url
          : "/",
    },
    tag:
      typeof gegevens.tag === "string"
        ? gegevens.tag
        : undefined,
    renotify: Boolean(gegevens.renotify),
  };

  event.waitUntil(
    self.registration.showNotification(
      titel,
      opties,
    ),
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const doel =
      event.notification.data &&
      typeof event.notification.data.url ===
        "string"
        ? event.notification.data.url
        : "/";

    const doelUrl = new URL(
      doel,
      self.location.origin,
    ).href;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((vensters) => {
          for (const venster of vensters) {
            if (
              "focus" in venster &&
              venster.url.startsWith(
                self.location.origin,
              )
            ) {
              if ("navigate" in venster) {
                return venster
                  .navigate(doelUrl)
                  .then(() =>
                    venster.focus(),
                  );
              }

              return venster.focus();
            }
          }

          return clients.openWindow(doelUrl);
        }),
    );
  },
);
