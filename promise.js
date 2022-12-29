const process = require('node:process');

class MyPromise {
    // state of MyPromise: pending, fulfilled or rejected
    #state;
    // given value for fullfill or reject functions
    #value;
    // array for fullfilled handler functions
    #onFullfilledHandlers;
    // array for rejected handler functions
    #onRejectedHandlers;
    // reserved field for internal tracking
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
   *    // setTimeout(() => reject('rejected'), 1000);
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
        this.#state = 'fulfilled';
        this.#value = value;
        this.#onFullfilledHandlers.forEach((fn) => process.nextTick(fn));
        this.#onFullfilledHandlers = null;
    }

    /**
     * Reject with passed error 
     *
     * @param {MyPromise|Any} error
     * @param {Boolean} isCalled - Special internal call status tracking .reject()
     * @return {void} 
     */
    #reject(error, isCalled = false) {
        this.#state = 'rejected';
        this.#value = error;
        this.#onRejectedHandlers.forEach((fn) => process.nextTick(fn));
        this.#onRejectedHandlers = null;
        this.#isCalled = isCalled;
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
        return new MyPromise((resolve, reject) => {
            if (this.#state === "pending") {
                // register promise callback(s) if promise execute asynchronous
                this.#onFullfilledHandlers.push(() => {     
                    try {
                        const fulfilled = onFulfilled(this.#value);
                        
                        // check if callback returned MyPromise (like p.then((res) => new MyPromise(...)))
                        if (fulfilled instanceof MyPromise) {
                            // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                            /*
                            Example:
                            returned internal result of MyPromise back to .then() method to support future chaining

                            p.then((result) => {return new MyPromise((res, rej) => setTimeout(() => res(result), 1000))})
                            */
                            fulfilled.then(resolve, reject);
                        } else {
                            resolve(fulfilled);
                        }                            
                    } catch (error) {
                        reject(error);
                    }     
                })
                this.#onRejectedHandlers.push(() => {
                    try {
                        if (typeof onRejected !== 'function'){
                            reject(this.#value);

                            return;
                        } 

                        let rejected;

                        if (!this.#isCalled) {
                            rejected = onRejected(this.#value);
                        }
                        // check if callback returned MyPromise 
                        if (rejected instanceof MyPromise) {
                            // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                            rejected.then(resolve, reject);
                        } else {
                            reject(rejected, true);
                        }                           
                    } catch (error) {
                        reject(error);
                    }
                })
            }

            if (this.#state === "fulfilled") {
                // execute promise callback if promise already fulfilled
                try {
                    const fulfilled = onFulfilled(this.#value);
                    // check if callback returned MyPromise 
                    if (fulfilled instanceof MyPromise) {
                        // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                        fulfilled.then(resolve, reject);
                    } else {
                        resolve(fulfilled)
                    }   
                } catch (error) {
                    reject(error);
                }
                              
            }

            if (this.#state === "rejected") {
                try {
                    if (typeof onRejected !== 'function') {
                        reject(this.#value);
                        
                        return;
                    } 
                    // execute promise callback if promise already rejected
                    const rejected = onRejected(this.#value);
                    // check if callback returned MyPromise 
                    if (rejected instanceof MyPromise) {
                        // chain internal promise (returned inside .then()) with .then() promise to return result back to .then() promise
                        rejected.then(resolve, reject);
                    } else {
                        reject(rejected, true);
                    } 
                } catch (error) {
                    reject(error);
                }    
            }    
        })
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

