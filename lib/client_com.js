const {IPCChildClient} = require('message-relay-services')

// dropping the notion of callbacks for this version....

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
/**
 * ChildProcDBCom
 * 
 * A communication class for communication with a parent controller process.
 * 
 */
class ChildProcDBCom {

  // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
  //
    constructor(table_key,path,persistence,relays) {
        super()
        this.dirty = false
        this.root_path = process.cwd()
        this.table_key = table_key
        this.messenger_path = path
    }

    initialize(conf) {
        try {
            this.messenger = new IPCChildClient(conf)
        } catch (e) {
            console.log(e)
            console.log("From within publication-igid/lib/basic-version/db_com")
        }
    }

    async update(value) {
        let status = await this.messenger.mod_on_path({
            "table" : this.table_key,
            "hash" : id,
            "v" : value
        },this.messenger_path)
        if ( status.OK ) {
            this.dirty = true
        }
        return status.OK
    }

    async delete(id) {
        let status = await this.messenger.del_on_path({
            "table" : this.table_key,
            "hash" : id
        },this.messenger_path)
        if ( status.OK ) {
            this.dirty = true
        }
        return status.OK
    }

    async findOne(id) {         // the idea of findOne is that remote storage can by querried. But, in the local case it's just a get
        let obj = await this.get(id)
        if ( !( obj ) ) {
            return(false)
        } else return(obj)
    }

    async get(id) {
        let obj = await this.messenger.get_on_path({
            "table" : this.table_key,
            "hash" : id
        },this.messenger_path)
        if ( obj.err !== undefined ) return false
        return obj.v
    }

    async set(id,value) {
        let status = await this.messenger.set_on_path({
            "table" : this.table_key,
            "hash" : id,
            "v" : value
        },this.messenger_path)
        //
        if ( status.OK ) {
            this.dirty = true
        }
        return status.OK
    }

    async hash_set(key,value) {
        await this.set(key,value)
    }
}



module.exports = ChildProcDBCom