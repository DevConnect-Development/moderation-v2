// Env
import { config } from "dotenv";
config();

// Dependencies
import fs from "fs-extra";
import git from "simple-git";

// Main Function
export default async function () {
    // Variables
    const env = process.env;
    const URL = `https://${env.GIT_TOKEN}@github.com/${env.GIT_REPO}`;

    try {
        await fs.emptyDir("./updates");
        await git().clone(URL, "./updates");
        await fs.remove("./updates/.git")
        await fs.emptyDir("./src")
        await fs.copy("./updates", ".");
        await fs.emptyDir("./updates");

        return true;
    } catch (e) {
        if (e) {
            return false;
        }
    }
}
