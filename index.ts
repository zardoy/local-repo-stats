import size from "fast-folder-size";
import { fdir } from "fdir";
import fileSize from "filesize";
import fs from "fs";
import kleur from "kleur";
import _ from "lodash";
import path from "path";
import util from "util";

const sizeAsync = util.promisify(size);

const workdir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null;

if (!workdir) throw new TypeError(`Specify path to your home with projects with node_modules in argument!`);

(async () => {
    const deps: Record<string, { size: number, versions: string[], count: number; }> = {};
    const output = await new fdir()
        // .onlyDirs()
        .withFullPaths()
        .glob("./**/node_modules/*/package.json", "./**/node_modules/@*/*/package.json")
        .crawl(workdir)
        .withPromise();
    for (const packagePath of output as string[]) {
        const packageJson = JSON.parse(await fs.promises.readFile(packagePath, "utf-8"));
        const packageVersion: string = packageJson.version;
        if (!packageVersion) {
            console.error(packagePath, "doesn't have version field");
            continue;
        }
        const packageName: string = packageJson.name;
        if (!deps[packageName]) deps[packageName] = {
            size: await sizeAsync(path.dirname(packagePath)),
            count: 0,
            versions: []
        };
        if (!deps[packageName].versions.includes(packageVersion)) deps[packageName].versions.push(packageVersion);
        deps[packageName].count++;
    }
    const depsEntries = _.sortBy(Object.entries(deps), o => o[1].size).reverse();

    // PRINT THE MOST HEAVY MODULES
    // let i = 0;
    // for (const [depName, { size, versions, count }] of depsEntries) {
    //     console.log(kleur.green().bold(depName), kleur.yellow(`${fileSize(size)} * ${count}`));
    //     if (++i > 20) return;
    // }

    const savePerModuleMax = depsEntries.map(([module, { count, size, versions }]) => {
        return size * count - 1;
    });
    const saveTotal = savePerModuleMax.reduce((prev, current) => prev + current);

    // if you used deltas or used the same version of every module!
    console.log(`You could save up to ${kleur.green().bold(fileSize(saveTotal))}`);
})().catch(console.error);
