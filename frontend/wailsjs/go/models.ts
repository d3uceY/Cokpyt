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

