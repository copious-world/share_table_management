const {ServeMessageEndpoint} = require('message-relay-services')


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
    constructor(conf,c_proc) {
        super(conf)
        //
        this.c_proc = c_proc
        this._in_mem_table = {}
        this._time_stamp_queue = []
        //
        this.messenger = new ClientOfParent(conf,c_proc)
        //
        this.subscribe_to_parent_commands(conf)
    }

    //
    subscribe_to_parent_commands(conf) {
        let parent_subscription_conf = conf.parent_command_conf
        //
        let handler_supplier = require(parent_subscription_conf.parent_response_handler)
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

    //
    unsubscribe_to_parent_commands() {
        //
        let conf = this.conf
        let parent_subscription_conf = conf.parent_command_conf
        let parent_topic_list = parent_subscription_conf.accepted_topics
        //
        for ( let topic_def of parent_topic_list ) {
            let topic = topic_def.topic
            let path = "proc-control"
            this.messenger.unsubscribe(topic,pathr)
        }
    }

    //
    id_augmentation(msg_obj) {
        let user_id = msg_obj._user_dir_key ? msg_obj[msg_obj._user_dir_key] : msg_obj._id
        if ( (user_id === undefined) && (msg_obj._id !== undefined) ) {
            user_id = msg_obj._id
        }
        msg_obj._id = user_id
    }


    // alter the data object for user consumption... such as removing secrets or control codes
    // 
    async application_data_update(msg_obj,data) {
        return(data)
    }

    //
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

    //
    async create_entry_type(msg_obj) {
        let hash = msg_obj.data.hash
        let val_obj = this._in_mem_table[hash]
        if ( val_obj !== undefined ) return false
        this._in_mem_table[hash] = msg_obj.data.v
        msg_obj.data.time = Date.now();
        this._time_stamp_queue.push(msg_obj.data)
        return true
    }

    //
    async update_entry_type(msg_obj) {
        let hash = msg_obj.hash
        let val_obj = this._in_mem_table[hash]
        if ( val_obj === undefined ) {
            this.create_entry_type(msg_obj)
        } else {
            val_obj.v = msg_obj.v
        }
        return true
    }

    //
    async load_data(msg_obj) {
        let hash = msg_obj.hash
        let val_obj = this._in_mem_table[hash]
        if ( val_obj !== undefined ) {
            return val_obj.v
        } else {
            return false
        }
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
                let status = await this.create_entry_type(msg_obj)
                if ( status ) {
                    result = "OK"
                    this.app_publish('C$shared',msg_obj)
                }
                return({ "status" : result,  "explain" : "set", "when" : Date.now() })
            }
            case 'M' : {
                let status = await this.update_entry_type(msg_obj)
                if ( status ) {
                    result = "OK"
                    this.app_publish('M$shared',msg_obj)
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
                    this.app_publish('D$shared',msg_obj)
                }
                return({ "status" : result,  "explain" : "del", "when" : Date.now() })
            }
            default: {  // or send 'S'
                let action = msg_obj._user_op
                let status = false
                if ( action === "create" ) {
                    status = await this.create_entry_type(msg_obj)
                } else if ( action === "update" ) {
                    status = await this.update_entry_type(msg_obj)
                }
                result = status ? "OK" : "ERR"
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
        console.log("Descendent must implement app_publication_pre_fan_response")
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
        console.log("Descendent must implement app_subscription_handler")
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
        console.log("Descendent must implement app_post_start_subscription")
    }



}



module.exports = ProcJSTableManager

