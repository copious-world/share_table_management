const {MessageRelayer} = require('message-relay-services')

// dropping the notion of callbacks for this version....

// the client of storage

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
/**
 * ChildProcDBComInterface
 * 
 * A communication class for communication with a parent controller process.
 * 
 */
class ChildProcDBComInterface  {

  // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
  //
    constructor(conf) {
        // no super -- base class
        this.dirty = false
        this.root_path = process.cwd()
        this.conf = conf
        this.messenger_path = "mem-table"
        this.messenger = new MessageRelayer(conf.in_mem_table_connect)
        //
        //
        this.initialize(conf)
    }

    initialize(conf) {
        if ( conf !== undefined ) {
            this.conf = conf
        }
    }


    async update(value) {
        let status = await this.messenger.mod_on_path({
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
        } else return(obj.v)
    }

    async get(id) {
        let obj = await this.messenger.get_on_path({
            "hash" : id
        },this.messenger_path)
        if ( obj.err !== undefined ) return false
        return obj.v
    }

    async set(id,value) {
        let status = await this.messenger.set_on_path({
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



module.exports = ChildProcDBComInterface