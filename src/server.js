const dotenv = require("dotenv");
const app = require("./app");
const connectDatabase = require("./configs/database");

dotenv.config();

const PORT = process.env.PORT || 3000;

connectDatabase();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});