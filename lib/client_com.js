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
        if ( conf === undefined ) {
            throw new Error("ChildProcDBComInterface in share_table_management module has no config object on construction")
        }
        // no super -- base class
        this.dirty = false
        this.root_path = process.cwd()
        this.conf = conf
        this.messenger_path = "mem-table"
        this.messenger = new MessageRelayer(conf.in_mem_table_connect)
        //
        //
    }


    async ready() {
        let p = new Promise((resolve,reject) => {
            let self = this
            this.messenger.on('client-ready',async (origin) => {
                console.log(`client is ready at ${origin}`)
                await self.initialize()
                resolve(true)
            })  
        })
        return p
    }

    close() {
        this.messenger.closeAll()
    }

    message_handler_mem_table(msg) {
        console.log("service mem table message ")
        console.dir(msg)
    }


    message_handler_admin(msg) {
        if ( msg.shutdown ) {
            this.close()
        }
        console.log("service mem table message ADMIN")
        console.dir(msg)
    }


    /*
    {
        hash: 8004.129546558061,
        v: 'This is a 98 test',
        _tx_op: 'S',
        _m_path: 'mem-table',
        topic: 'C$shared'
    }
    */


    message_handler_set(msg) {
        //console.log("service has created a new entry")
        //console.dir(msg)
    }
    message_handler_update(msg) {
        console.log("service has updated an entry")
        //console.dir(msg)
    }
    message_handler_del(msg) {
        //console.log("service has deleted an entry")
        //console.dir(msg)
    }


    async  initialize(conf) {
        let topic = "mem-table"
        let path = this.messenger_path
        let self = this
        //
        let message = {
            "root_path" : this.root_path
        }
        let handler = (msg) => {
            self.message_handler_mem_table(msg)
        }
        await this.messenger.subscribe(topic,path,message,handler)
        //
        topic = "admin"
        path = this.messenger_path
        message = {
            "root_path" : this.root_path
        }
        handler = (msg) => {
            self.message_handler_admin(msg)
        }
        await this.messenger.subscribe(topic,path,message,handler)
        //
        topic = 'C$shared'
        path = this.messenger_path
        message = {
            "root_path" : this.root_path
        }
        handler = (msg) => {
            self.message_handler_set(msg)
        }
        await this.messenger.subscribe(topic,path,message,handler)
        //
        topic = 'M$shared'
        path = this.messenger_path
        message = {
            "root_path" : this.root_path
        }
        handler = (msg) => {
            self.message_handler_update(msg)
        }
        await this.messenger.subscribe(topic,path,message,handler)
        //
        topic = 'D$shared'
        path = this.messenger_path
        message = {
            "root_path" : this.root_path
        }
        handler = (msg) => {
            self.message_handler_del(msg)
        }
        await this.messenger.subscribe(topic,path,message,handler)
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
        return obj.data
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