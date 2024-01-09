module.exports = class MyPromise {
    // state of MyPromise: pending, fulfilled or rejected
    #state;
    // given value for fullfill or reject functions
    #value;
    // array for fullfilled handler functions
    #onFullfilledHandlers;
    // array for rejected handler functions
    #onRejectedHandlers;
    // reserved field for internal tracking of the MyPromise resolution
    #isCalled;
    /**
   * @param {Function} func - Handler function with 2 prepared callbacks: `resolve` and `reject`  
   * `resolve`- resolved with given value
   * 
   * `reject`- rejected with given value
   * 
   * @example
   * 
   * const promise = new MyPromise((resolve, reject) => {
   *    setTimeout(() => resolve('resolved!'), 1000);
   *    // setTimeout(() => reject('rejected!'), 1000);
   * })
   * @return {MyPromise}
   */
    constructor(func) {
        this.#state = 'pending';
        this.#onFullfilledHandlers = [];
        this.#onRejectedHandlers = [];
        this.#isCalled = false;
        
        try {
            this.#resolve(func, this.#fulfill.bind(this), this.#reject.bind(this));    
        } catch (error) {
            this.#reject(error);
        }
    }
     /**
     * Fulfill with passed value 
     *
     * @param {MyPromise|Any} value
     * @return {void}
     */
    #fulfill(value) {  
        if (this.#isCalled) return;

        if (value && (typeof value === 'object' || typeof value === 'function')) { 
            try { 
                let then;

                if (typeof (then = value.then) === 'function') {
                    then.bind(value)(this.#fulfill.bind(this), this.#reject.bind(this))
                    return;
                }                 
            } catch (error) {
                this.#reject(error);
                return;
            }          
        } 
      
        this.#value = value;   
        this.#state = 'fulfilled'; 
        this.#isCalled = true;
        // setTimeout(() => {
        //     this.#onFullfilledHandlers.forEach((fn) => fn());
        // }, 0);
        
        this.#onFullfilledHandlers.forEach((fn) => setTimeout(() => fn(), 0));
       
       // this.#onFullfilledHandlers = null;
    }

    /**
     * Reject with passed error 
     *
     * @param {MyPromise|Any} error
     * @param {Boolean} isThrown - Special internal call status tracking when a onFulfilled/onRejected throws a thenable (See then method 2.2.7.2)
     * @return {void} 
     */
    #reject(error, isThrown = false) {  
        if (this.#isCalled) return;

        if (!isThrown && error && (typeof error === 'object'  || typeof error === 'function')) { 
            try {
                let then;

                if (typeof (then = error.then) === 'function') {
                    then.bind(error)(this.#fulfill.bind(this), this.#reject.bind(this))
                    return;
                }            
                
            } catch (err) {
                this.#reject(err);
                return;
            } 
        } 

        this.#value = error;   
        this.#state = 'rejected';
        this.#isCalled = true;
      
        // setTimeout(() => {
        //     this.#onRejectedHandlers.forEach((fn) => fn());            
        // }, 0);
      
       this.#onRejectedHandlers.forEach((fn) => setTimeout(() => fn(), 0));
       
       // this.#onRejectedHandlers = null;
    }

    /**
     * Resolve given handler 
     *
     * @param {MyPromise|Any} value
     * @return {void}
     */
    #resolve(fn, onFulfilled, onRejected) {
        if (this.#state === 'pending') {
            fn(onFulfilled, onRejected); 
        }
    }

    /**
     * If the passed argument is a function, it is called asynchronously when `MyPromise` is resolved.
     * 
     * Subscribe to given `MyPromise`
     * and register 2 callbacks:
     * `onFulfilled` and `onRejected`
     * 
     * `onFulfilled(value)` takes fullfilled value as parameter from subcribed `MyPromise`
     * 
     * `onRejected(value)` takes rejected value as parameter from subcribed `MyPromise`
     * 
     * It immediately returns an equivalent `MyPromise` object, allowing you to chain
     * calls to other `MyPromise` methods. This new promise is always pending when returned, regardless of the current promise's status.
     * 
     * @example
     * 
     * then(onFulfilled)
     * then(onFulfilled, onRejected)
     *
     * then(
     * (value) =>  { fulfillment handler },
     * (reason) => { rejection handler },
     * )
     * @param {Function | Any} onFulfilled
     * @param {Function | Any} onRejected
     * @return {MyPromise}
     */
    then(onFulfilled, onRejected) {     
        const p = new MyPromise((resolve, reject) => {         
            if (this.#state === "pending") {
                // register promise callback(s) if promise execute asynchronous
                this.#onFullfilledHandlers.push(() => {     
                    try {
                        if (typeof onFulfilled !== 'function') {
                            resolve(this.#value);

                            return;
                        }

                        const fulfilled = onFulfilled(this.#value);
                       

                        // check if callback returned MyPromise (like p.then((res) => new MyPromise(...)))
                        if (fulfilled && (typeof fulfilled === 'object' || typeof fulfilled === 'function')) { 
                            // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                            /*
                            Example:
                            returned internal result of MyPromise back to .then() method to support future chaining

                            p.then((result) => {return new MyPromise((res, rej) => setTimeout(() => res(result), 1000))})
                            */
                          
                            let then;
                        // Do not increase internal counter (https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.3.3.js#L135C28-L135C61)
                        if (typeof (then = fulfilled.then) === 'function') {                                      

                            then.bind(fulfilled)(resolve, reject);
                        } else {
                            resolve(fulfilled);
                        }
                        } else {
                            resolve(fulfilled);
                        }                            
                    } catch (error) {                        
                        reject(error, true);
                    }     
                })
                this.#onRejectedHandlers.push(() => {  
                    try {
                        if (typeof onRejected !== 'function') {
                            reject(this.#value);

                            return;
                        } 

                        const rejected = onRejected(this.#value);

                        // if (!this.#isCalled) {
                        //     rejected = onRejected(this.#value);
                        // } Test this with .catch()

                        // check if callback returned MyPromise 
                       
                        if (rejected && (typeof rejected === 'object'  || typeof rejected === 'function')) { 
                            // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                            let then;
                            // Do not increase internal counter (https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.3.3.js#L135C28-L135C61)
                            if (typeof (then = rejected.then) === 'function') {                                      
    
                                then.bind(rejected)(resolve, reject);
                            } else {
                                resolve(rejected);
                            }
                        } else {
                            resolve(rejected, true);
                        }                           
                    } catch (error) {
                        reject(error, true);
                    }
                })
            }

            if (this.#state === "fulfilled") { 
               setTimeout(() => {
                try {
                    if (typeof onFulfilled !== 'function') {
                        resolve(this.#value);

                        return;
                    }

                    // execute promise callback if promise already fulfilled
                    const fulfilled = onFulfilled(this.#value);

                    if (p === fulfilled) {
                        throw new TypeError('Promise and x refer to the same object.');
                    }
               
                    // check if callback returned MyPromise 
                    if (fulfilled && (typeof fulfilled === 'object' || typeof fulfilled === 'function')) { 
                        // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                        let then;
                        // Do not increase internal counter (https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.3.3.js#L135C28-L135C61)
                        if (typeof (then = fulfilled.then) === 'function') {                         

                            then.bind(fulfilled)(resolve, reject);
                        } else {
                            resolve(fulfilled);
                        }
                    } else {
                        resolve(fulfilled)
                    }   
                } catch (error) {
                    reject(error, true);
                }
               }, 0)                
            }

            if (this.#state === "rejected") { 
                setTimeout(() => {
                    try {
                        if (typeof onRejected !== 'function') {
                            reject(this.#value);
                            
                            return;
                        } 
                        // execute promise callback if promise already rejected
                        const rejected = onRejected(this.#value);

                        if (p === rejected) {
                            throw new TypeError('Promise and x refer to the same object.');
                        }

                        // check if callback returned MyPromise 
                        if (rejected && (typeof rejected === 'object' || typeof rejected === 'function')) { 
                            // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                            let then;
                            // Do not increase internal counter (https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.3.3.js#L135C28-L135C61)
                            if (typeof (then = rejected.then) === 'function') {    
                                then.bind(rejected)(resolve, reject);
                            } else {
                                resolve(rejected);
                            }
                            
                        } else {
                            resolve(rejected);
                        } 
                    } catch (error) {
                        reject(error, true);
                    }    
                }, 0)
            }    
        })

        return p;
    }

    /**
     * Syntatic sugar for .then(null, reject)
     * 
     * @param {Function} onRejected
     * @returns {MyPromise} 
     */
    catch(onRejected) {
        if (!this.#isCalled && this.#state !== 'fulfilled') {
            return this.then(null, onRejected);
        }
        return new MyPromise(() => {});
    }
}    
