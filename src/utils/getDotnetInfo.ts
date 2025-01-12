/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from "path";
import { execChildProcess } from "../common";
import { CoreClrDebugUtil } from "../coreclr-debug/util";

export const DOTNET_MISSING_MESSAGE = "A valid dotnet installation could not be found.";

let _dotnetInfo: DotnetInfo;

// This function checks for the presence of dotnet on the path and ensures the Version
// is new enough for us.
// Returns: a promise that returns a DotnetInfo class
// Throws: An DotNetCliError() from the return promise if either dotnet does not exist or is too old.
export async function getDotnetInfo(dotNetCliPaths: string[]): Promise<DotnetInfo> {
    if (_dotnetInfo !== undefined) {
        return _dotnetInfo;
    }

    let dotnetExeName = CoreClrDebugUtil.getPlatformExeExtension();
    let dotnetExecutablePath = undefined;

    for (const dotnetPath of dotNetCliPaths) {
        let dotnetFullPath = join(dotnetPath, dotnetExeName);
        if (CoreClrDebugUtil.existsSync(dotnetFullPath)) {
            dotnetExecutablePath = dotnetFullPath;
            break;
        }
    }

    let dotnetInfo = new DotnetInfo();

    try {
        let data = await execChildProcess(`${dotnetExecutablePath || 'dotnet'} --info`, process.cwd());

        dotnetInfo.CliPath = dotnetExecutablePath; 

        dotnetInfo.FullInfo = data;

        let lines: string[] = data.replace(/\r/mg, '').split('\n');
        lines.forEach(line => {
            let match: RegExpMatchArray;
            if (match = /^\ Version:\s*([^\s].*)$/.exec(line)) {
                dotnetInfo.Version = match[1];
            } else if (match = /^\ OS Version:\s*([^\s].*)$/.exec(line)) {
                dotnetInfo.OsVersion = match[1];
            } else if (match = /^\ RID:\s*([\w\-\.]+)$/.exec(line)) {
                dotnetInfo.RuntimeId = match[1];
            }
        });

        _dotnetInfo = dotnetInfo;
    }
    catch
    {
        // something went wrong with spawning 'dotnet --info'
        dotnetInfo.FullInfo = DOTNET_MISSING_MESSAGE;
    }

    return dotnetInfo;
}

export class DotnetInfo {
    public CliPath?: string;
    public FullInfo: string;
    public Version: string;
    public OsVersion: string;
    public RuntimeId: string;
}