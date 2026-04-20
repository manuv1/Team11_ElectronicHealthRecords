import { createApp } from "./app";

const PORT = process.env.PORT ?? "4000";

const app = createApp();

app.listen(Number(PORT), () => {
  console.log(`Backend server listening on port ${PORT}`);
});
