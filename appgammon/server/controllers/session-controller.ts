import app from "../app";

// Make sessioning routes with root app
app.post("/session", (c) => {
  c.text("POST /session");
  return c.text("Session Creatd");
});
