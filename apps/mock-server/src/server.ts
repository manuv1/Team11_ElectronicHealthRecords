import { createMockServer } from "./app";

const PORT = process.env.PORT ?? "4100";

const app = createMockServer();

app.listen(Number(PORT), () => {
  console.log(`Mock server listening on port ${PORT}`);
});
