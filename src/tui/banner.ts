import chalk from "chalk";
import { ICARUS_ART } from "./ascii_art";

export function printBanner(): void {
  console.log(chalk.white(ICARUS_ART));
}
