export namespace domain {
	
	export class ActiveSession {
	    id: string;
	    connectionId: string;
	    connectionName: string;
	    host: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ActiveSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.connectionId = source["connectionId"];
	        this.connectionName = source["connectionName"];
	        this.host = source["host"];
	        this.status = source["status"];
	    }
	}
	export class AppSettings {
	    theme: string;
	    fontFamily: string;
	    fontSize: number;
	    defaultShell: string;
	    scrollback: number;
	    cursorStyle: string;
	    cursorBlink: boolean;
	    copyOnSelect: boolean;
	    confirmOnClose: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.fontFamily = source["fontFamily"];
	        this.fontSize = source["fontSize"];
	        this.defaultShell = source["defaultShell"];
	        this.scrollback = source["scrollback"];
	        this.cursorStyle = source["cursorStyle"];
	        this.cursorBlink = source["cursorBlink"];
	        this.copyOnSelect = source["copyOnSelect"];
	        this.confirmOnClose = source["confirmOnClose"];
	    }
	}
	export class Connection {
	    id: string;
	    name: string;
	    groupId?: string;
	    host: string;
	    port: number;
	    username: string;
	    authMethod: string;
	    credentialId?: string;
	    password?: string;
	    privateKey?: string;
	    keyPassphrase?: string;
	    jumpHostIds?: string;
	    keepAliveInterval: number;
	    connectionTimeout: number;
	    terminalType: string;
	    fontSize: number;
	    sortOrder: number;
	    lastUsedAt?: number;
	    createdAt: number;
	    updatedAt: number;
	    deletedAt?: number;
	
	    static createFrom(source: any = {}) {
	        return new Connection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.groupId = source["groupId"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.authMethod = source["authMethod"];
	        this.credentialId = source["credentialId"];
	        this.password = source["password"];
	        this.privateKey = source["privateKey"];
	        this.keyPassphrase = source["keyPassphrase"];
	        this.jumpHostIds = source["jumpHostIds"];
	        this.keepAliveInterval = source["keepAliveInterval"];
	        this.connectionTimeout = source["connectionTimeout"];
	        this.terminalType = source["terminalType"];
	        this.fontSize = source["fontSize"];
	        this.sortOrder = source["sortOrder"];
	        this.lastUsedAt = source["lastUsedAt"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.deletedAt = source["deletedAt"];
	    }
	}
	export class Credential {
	    id: string;
	    name: string;
	    type: string;
	    password?: string;
	    privateKey?: string;
	    keyPassphrase?: string;
	    fingerprint?: string;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Credential(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.password = source["password"];
	        this.privateKey = source["privateKey"];
	        this.keyPassphrase = source["keyPassphrase"];
	        this.fingerprint = source["fingerprint"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class FileEntry {
	    name: string;
	    path: string;
	    isDir: boolean;
	    size: number;
	    modTime: number;
	    mode: string;
	
	    static createFrom(source: any = {}) {
	        return new FileEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.size = source["size"];
	        this.modTime = source["modTime"];
	        this.mode = source["mode"];
	    }
	}
	export class Group {
	    id: string;
	    name: string;
	    parentId?: string;
	    sortOrder: number;
	    isExpanded: boolean;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Group(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.parentId = source["parentId"];
	        this.sortOrder = source["sortOrder"];
	        this.isExpanded = source["isExpanded"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

