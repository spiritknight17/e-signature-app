import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { 
  getUsers, getUser, getUserByEmail, createUser, loginUser,
  getDocuments, getDocument, requestSignature, 
  getSignatures, getSignature, signDocument, cancelSignature 
} from "./handlers";

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .group("/users", (app) => app
    .get("/", () => getUsers())
    .get("/:id", ({ params: { id } }) => getUser(id), {
      params: t.Object({ id: t.String() }),
    })
    .get("/by-email/:email", ({ params: { email } }) => getUserByEmail(email), {
      params: t.Object({ email: t.String() }),
    })
    .post("/", ({ body }) => createUser(body), {
      body: t.Object({
        id: t.Optional(t.String()),
        email: t.String(),
        username: t.String(),
        password: t.Optional(t.String())
      })
    })
    .post("/login", ({ body }) => loginUser(body), {
      body: t.Object({
        email: t.Optional(t.String()),
        username: t.Optional(t.String()),
        password: t.String()
      })
    })
  )
  .group("/documents", (app) => app
    .get("/", () => getDocuments())
    .get("/:id", ({ params: { id } }) => getDocument(id), {
      params: t.Object({ id: t.Numeric() }),
    })
    .post("/request", ({ body }) => requestSignature(body), {
      body: t.Object({
        requester: t.String(),
        unsignedFile: t.File(),
        signers: t.Union([t.String(), t.Array(t.String())]) // FormData might send array or string
      })
    })
  )
  .group("/signatures", (app) => app
    .get("/", () => getSignatures())
    .get("/:id", ({ params: { id } }) => getSignature(id), {
      params: t.Object({ id: t.Numeric() }),
    })
    .post("/sign", ({ body }) => signDocument(body), {
      body: t.Object({
        signatureId: t.Numeric(),
        signerId: t.String(),
        signedFile: t.File()
      })
    })
    .post("/:id/cancel", ({ params: { id }, body }) => cancelSignature(id, body.signerId), {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        signerId: t.String()
      })
    })
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
