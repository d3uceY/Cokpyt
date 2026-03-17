export namespace main {
	
	export class UpdateInfo {
	    hasUpdate: boolean;
	    latestVersion: string;
	    releaseURL: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasUpdate = source["hasUpdate"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseURL = source["releaseURL"];
	    }
	}

}

export namespace pip {
	
	export class VenvEntry {
	    name: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new VenvEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	    }
	}
	export class AppConfig {
	    theme: string;
	    tourSeen: boolean;
	    activeEnv: string;
	    environments: VenvEntry[];
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.tourSeen = source["tourSeen"];
	        this.activeEnv = source["activeEnv"];
	        this.environments = this.convertValues(source["environments"], VenvEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CleanupInfo {
	    cacheSize: string;
	    eggInfoSize: string;
	    pycacheSize: string;
	
	    static createFrom(source: any = {}) {
	        return new CleanupInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cacheSize = source["cacheSize"];
	        this.eggInfoSize = source["eggInfoSize"];
	        this.pycacheSize = source["pycacheSize"];
	    }
	}
	export class DoctorCheck {
	    name: string;
	    status: string;
	    detail: string;
	    fixUrl: string;
	    fixHint: string;
	
	    static createFrom(source: any = {}) {
	        return new DoctorCheck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.status = source["status"];
	        this.detail = source["detail"];
	        this.fixUrl = source["fixUrl"];
	        this.fixHint = source["fixHint"];
	    }
	}
	export class DoctorReport {
	    checks: DoctorCheck[];
	    ok: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DoctorReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.checks = this.convertValues(source["checks"], DoctorCheck);
	        this.ok = source["ok"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryEntry {
	    id: string;
	    action: string;
	    package: string;
	    version: string;
	    status: string;
	    timestamp: string;
	    command: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.action = source["action"];
	        this.package = source["package"];
	        this.version = source["version"];
	        this.status = source["status"];
	        this.timestamp = source["timestamp"];
	        this.command = source["command"];
	    }
	}
	export class LogEntry {
	    timestamp: string;
	    level: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = source["timestamp"];
	        this.level = source["level"];
	        this.message = source["message"];
	    }
	}
	export class OutdatedPackage {
	    name: string;
	    version: string;
	    latestVersion: string;
	    bumpType: string;
	    changelogUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new OutdatedPackage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.latestVersion = source["latestVersion"];
	        this.bumpType = source["bumpType"];
	        this.changelogUrl = source["changelogUrl"];
	    }
	}
	export class PipEnvironmentInfo {
	    pythonVersion: string;
	    pipVersion: string;
	    pythonPath: string;
	    sitePackages: string;
	    venvActive: boolean;
	    venvPath: string;
	
	    static createFrom(source: any = {}) {
	        return new PipEnvironmentInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pythonVersion = source["pythonVersion"];
	        this.pipVersion = source["pipVersion"];
	        this.pythonPath = source["pythonPath"];
	        this.sitePackages = source["sitePackages"];
	        this.venvActive = source["venvActive"];
	        this.venvPath = source["venvPath"];
	    }
	}
	export class PipPackage {
	    name: string;
	    version: string;
	    latestVersion: string;
	    summary: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new PipPackage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.latestVersion = source["latestVersion"];
	        this.summary = source["summary"];
	        this.status = source["status"];
	    }
	}
	export class PythonInfo {
	    pythonVersion: string;
	    pipVersion: string;
	
	    static createFrom(source: any = {}) {
	        return new PythonInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pythonVersion = source["pythonVersion"];
	        this.pipVersion = source["pipVersion"];
	    }
	}
	export class SearchResult {
	    name: string;
	    version: string;
	    description: string;
	    author: string;
	    homePage: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.description = source["description"];
	        this.author = source["author"];
	        this.homePage = source["homePage"];
	    }
	}

}

