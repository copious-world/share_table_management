const {ServeMessageEndpoint} = require('message-relay-services')
const crypto = require('crypto')

const DEFAULT_AGE_WINDOW = 10000

// This is an endpoint server with communication from the parent also

/**
 * ProcJSTableManager
 * 
 * This class provides a fuax DB interface for parents and children. 
 * There is no message forwarding for communication between the classes. 
 * 
 */
class ProcJSTableManager extends ServeMessageEndpoint {
    //
    constructor(conf) {
        super(conf)
        //
        this._in_mem_table = {}
        this._in_mem_verify_table = {}
        this._time_stamp_queue = []
        this.messenger_path = "mem-table"
        //
        this.conf = conf
        this.timer_list = []
        //
        this.messenger = false
        if ( typeof process.send === 'function' ) {
            this.subscribe_to_parent_commands(conf)
        }
        //
        this._te = new TextEncoder()
        //
        this.init_timers()
    }


    /**
     * do_hash
     * @param {string} msg 
     * @returns 
     */
    do_hash(msg) {
        let buf = this._te.encode(msg)
        let hh = crypto.hash('sha256',buf)
        return hh 
    }

    /**
     * init_timers
     */
    init_timers() {
        let conf = this.conf
        if ( conf.aging !== undefined ) {
            let self = this
            let window_size = conf.age_window !== undefined ? parseInt(conf.age_window) : DEFAULT_AGE_WINDOW
            this.timer_list.push(setInterval(() => {
                self.expel_aged_entries(self,window_size)
            },parseInt(conf.aging)))
        }
    }

    /**
     * shutdown_timers
     */
    shutdown_timers() {
        for ( let timer of this.timer_list ) {
            clearInterval(timer)
        }
    }

    /**
     * subscribe_to_parent_commands
     * 
     * --only if-- a launching process (parent) is detected (in nodejs by virtue of a process.send command)
     * 
     * @param {object} conf 
     */
    subscribe_to_parent_commands(conf) {
        let parent_subscription_conf = conf.parent_command_conf
        if ( parent_subscription_conf && parent_subscription_conf.parent_com ) {
            if ( parent_subscription_conf.class_choice ) {
                let ClientOfParent = require(parent_subscription_conf.parent_com)[parent_subscription_conf.class_choice]
                this.messenger = new ClientOfParent(parent_subscription_conf.parent_conf)
            } else {
                let ClientOfParent = require(parent_subscription_conf.parent_com)
                this.messenger = new ClientOfParent(parent_subscription_conf.parent_conf)
            }
            //
            let HandlerFactory = require(parent_subscription_conf.parent_response_handler)
            let handler_supplier = new HandlerFactory(parent_subscription_conf.handler_conf)
            let parent_topic_list = parent_subscription_conf.accepted_topics
            //
            for ( let topic_def of parent_topic_list ) {
                let topic = topic_def.topic
                let path = "proc-control"
                let message = {}
                let handler = handler_supplier.get_supplier_action(topic,path,this)
                this.messenger.subscribe(topic,path,message,handler)
            }
        }
    }


    /**
     * unsubscribe_to_parent_commands
     * 
     * --only if-- a launching process (parent) is detected (in nodejs by virtue of a process.send command)
     * 
     * @param {object} conf 
     */

    unsubscribe_to_parent_commands() {
        //
        if ( this.messenger ) {
            let conf = this.conf
            let parent_subscription_conf = conf.parent_command_conf
            let parent_topic_list = parent_subscription_conf.accepted_topics
            //
            for ( let topic_def of parent_topic_list ) {
                let topic = topic_def.topic
                let path = "proc-control"
                this.messenger.unsubscribe(topic,path)
            }    
        }
    }

    //
    /**
     * id_augmentation
     * 
     * @param {object} msg_obj 
     */
    id_augmentation(msg_obj) {   // hash the object ...  
        let user_id = msg_obj._user_dir_key ? msg_obj[msg_obj._user_dir_key] : msg_obj._id
        if ( (user_id === undefined) && (msg_obj._id !== undefined) ) {
            user_id = msg_obj._id
        }
        msg_obj._id = user_id
    }


    // alter the data object for user consumption... such as removing secrets or control codes
    // 
    /**
     * application_data_update
     * 
     * 
     * @param {object} msg_obj 
     * @param {object} data 
     * @returns 
     */
    async application_data_update(msg_obj,data) {
        return(data)
    }


    /**
     * expel_aged_entries
     * 
     * 
     * @param {object} caller - this... in a different context
     * @param {timer} interval - the lower bound on being able to stay
     */
    async expel_aged_entries(caller,interval) {
        //
        let n = caller._time_stamp_queue.length
        if ( n > 0 ) {
            let del_time = Date.now()
            del_time -= interval
            //
            while ( n > 0 ) {
                n--;
                let entry = caller._time_stamp_queue[n]
                if ( entry.time < del_time ) {
    
                    caller._time_stamp_queue.splice(n,1)
                    let hash = entry.hash
                    delete caller._in_mem_table[hash]
                    await caller.app_publish_on_path('D$shared',this.messenger_path,entry)    // await
                }
            }
        }
    }

    /**
     * delete
     * 
     * @param {object} msg_obj 
     * @returns boolean
     */
    async delete(msg_obj) {
        //
        let hash = msg_obj.hash
        let val_obj = this._in_mem_table[hash]
        delete this._in_mem_table[hash]

        let time = val_obj.time
        let index = this._time_stamp_queue.findIndex((value) => {
            return ( value.time === time ) && (value.hash === hash )
        })
        //
        this._time_stamp_queue.splice(index,1)
        //
        return true
    }

    /**
     * create_entry_type
     * 
     * @param {object} msg_obj 
     * @returns boolean
     */
    async create_entry_type(msg_obj) {
        let hash = msg_obj.hash
        let val_obj = this._in_mem_table[hash]
        if ( val_obj !== undefined ) return false
        //
        let v = msg_obj.v
        let stored = {
            "hash" : hash,
            "v" : v,
            "time" : Date.now()
        }
        //

        this._in_mem_table[hash] = v
        let link_hash = msg_obj.link_hash
        this._in_mem_verify_table[link_hash] = hash
        this._time_stamp_queue.push(stored)

//console.log(`storing ${v} at ${hash}  ${this._time_stamp_queue.length}`)
        return true
    }

    /**
     * update_entry_type
     * 
     * @param {object} msg_obj 
     * @returns boolean
     */
    async update_entry_type(msg_obj) {
        let hash = msg_obj.hash
        let val_obj = this._in_mem_table[hash]
        if ( val_obj === undefined ) {
            this.create_entry_type(msg_obj)
        } else {
            this._in_mem_table[hash] = msg_obj.v
        }
        return true
    }


    /**
     * load_data
     * 
     * @param {object} msg_obj 
     * @returns boolean
     */
    async load_data(msg_obj) {
        let hash = msg_obj.hash
        let v = this._in_mem_table[hash]

//console.log(`getting ${v} at ${hash}`)

        if ( v !== undefined ) {
            return v
        } else {
            return false
        }
    }


    /**
     * 
     * @param {string} link_hash 
     * @param {object} value 
     * @returns 
     */
    is_id_hash(link_hash,value) {   // example: link_hash, ccwid
        //
        let hash = this._in_mem_verify_table[link_hash]
        if ( hash !== undefined ) {
            if ( hash in this._in_mem_table ) {
                if ( this._in_mem_table[hash] === value ) {
                    return true
                }
            }
        }
        //
        return false
    }


    //
    async app_message_handler(msg_obj) {
        let op = msg_obj._tx_op
        let result = "ERR"
        //
        this.id_augmentation(msg_obj)
        //
        switch ( op ) {
            case 'S' : {
                msg_obj.link_hash = msg_obj._id
                let status = await this.create_entry_type(msg_obj)
                if ( status ) {
                    result = "OK"
                    this.app_publish_on_path('C$shared',this.messenger_path,msg_obj)
                }
                return({ "status" : result, "hash" : msg_obj.link_hash,  "explain" : "set", "when" : Date.now() })
            }
            case 'H' : {
                let value_str = msg_obj.v    //             "hash" : session key, "v" : value
                if ( typeof value_str !== 'string' ) { value_str = JSON.stringify(value_str) }
                //
                msg_obj.link_hash = this.do_hash(`${msg_obj.hash}-${value_str}`)
                let status = await this.create_entry_type(msg_obj)
                if ( status ) {
                    result = "OK"
                    this.app_publish_on_path('C$shared',this.messenger_path,msg_obj)
                }
                return({ "status" : result, "hash" : msg_obj.link_hash,  "explain" : "set", "when" : Date.now() })
            }
            case 'M' : {
                let status = await this.update_entry_type(msg_obj)
                if ( status ) {
                    result = "OK"
                    this.app_publish_on_path('M$shared',this.messenger_path,msg_obj)
                }
                return({ "status" : result,  "explain" : "mod", "when" : Date.now() })
            }
            case 'G' : {        // get user information
                let data = await this.load_data(msg_obj) // as a string not altered
                if ( data === false ) { data = "" }
                else {
                    result = "OK";
                    data = await this.application_data_update(msg_obj,data)  // alter the data object for user consumption... such as removing secrets or control codes
                }
                return({ "status" : result, "data" : data,  "explain" : "get", "when" : Date.now() })
            }
            case 'D' : {        // delete asset from everywhere if all ref counts to zero. (unpinned)
                let status = await this.delete(msg_obj)
                if ( status ) {
                    result = "OK"
                    this.app_publish_on_path('D$shared',this.messenger_path,msg_obj)
                }
                return({ "status" : result,  "explain" : "del", "when" : Date.now() })
            }
            default: {  // or send 'OP'
                //
                let action = msg_obj._user_op
                if ( action === "inv_hash" ) {
                    //  "link_hash" : link_hash, "v" : value
                    let truth = this.is_id_hash(msg_obj.link_hash,msg_obj.v)
                    if ( truth ) {
                        return({ "status" : "OK", "explain" : "inv_hash", "when" : Date.now() })
                    }
                }
                result = "ERR"
                //
            }
        }
        //
        return({ "status" : result, "explain" : `${op} performed`, "when" : Date.now(), "_tracking" : msg_obj._tracking })
    }


    // app_publication_pre_fan_response
    //  -- 
    /**
     * Runs before writing publications.
     * 
     * This runs if `app_can_block_and_respond`. A true value returned means that the application has blocked the publication.
     * 
     * Gives the application the chance to refuse a publication or to pass it based on criterea.
     * 
     * The application may take care of any operation it requires for publication prior to publishing 
     * with the intention of returning false to pass this on to publication. (One might imagine a situation
     * where the application will read a measurement from sensor and publish the message if the sensor has actually changed. The application version of this 
     * method would return false indicating that the update publication will not be blocked. The method can be used to write the new value onto 
     * the message object.)
     * 
     * The pulication method, `send_to_all` awaits the return of this method.
     * 
     * @param {string} topic 
     * @param {object} msg_obj 
     * @returns {boolean} True if this appliction will return without publishing to subscribers. False if going on to publication.
     */
     async app_publication_pre_fan_response(topic,msg_obj) {
        //console.log("Descendent must implement app_publication_pre_fan_response")
        return false
    }


    //  app_subscription_handler
    // -- runs post fanout of publication
    /**
     * 
     * Applications override this method if `app_handles_subscriptions` has been set via configuration.
     * This method is called after publication of a topic message to subscribers.
     * This method gives applications the chance to handle internal publication or to make database updates (say)
     * or any other action required to manage the pub/sub process.
     * 
     * 
     * @param {string} topic 
     * @param {object} msg_obj 
     */
    app_subscription_handler(topic,msg_obj) {
        //console.log("Descendent must implement app_subscription_handler")
    }

    

    /**
     * This method is always called by the `add_to_topic` method.
     * The application has the chance to perform any operation it needs to mark the beginning of a subscription 
     * and to set aside whatever resources or needed to manage the subscription.
     * 
     * @param {string} topic 
     * @param {string} client_name 
     * @param {object} relayer 
     */
    app_post_start_subscription(topic,client_name,relayer) {
        //console.log("Descendent must implement app_post_start_subscription")
    }



    release_and_exit() {
        this.shutdown_timers()
        this.closeAll()
    }

}



module.exports = ProcJSTableManager

