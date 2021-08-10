const app = require("./app");
const {contestsCron, dailyCron, reminderCron} = require('./crons')

let port = 8443;
let server = app.listen(port, () => {
  contestsCron.startSchedule();
  dailyCron.startSchedule();
  reminderCron.startSchedule();
  console.log(`Server started at port ${port}`);
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      console.log(`Server closed`);
      contestsCron.stopSchedule();
      dailyCron.stopSchedule();
      reminderCron.stopSchedule();
      process.exit(1);
    });
  } else {
    contestsCron.stopSchedule();
    dailyCron.stopSchedule();
    reminderCron.stopSchedule();
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  console.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  console.info("SIGTERM received");
  if (server) {
    server.close();
  }
});
