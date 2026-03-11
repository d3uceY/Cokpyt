export namespace pip {
	
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
	export class OutdatedPackage {
	    name: string;
	    version: string;
	    latestVersion: string;
	    bumpType: string;
	
	    static createFrom(source: any = {}) {
	        return new OutdatedPackage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.latestVersion = source["latestVersion"];
	        this.bumpType = source["bumpType"];
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

