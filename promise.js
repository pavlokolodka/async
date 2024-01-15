module.exports = class MyPromise {
    // 2.1 the states of MyPromise: pending, fulfilled, or rejected
    #state;
    // a MyPromise’s eventual value/reason
    #value;
    // an array for fulfilled handler functions
    #onFulfilledHandlers;
    // an array for rejected handler functions
    #onRejectedHandlers;
  
    /**
     * @param {Function} func - A handler function with 2 prepared callbacks: `resolve` and `reject`  
     * 
     * `resolve`- resolves with a given value
     * 
     * `reject`- rejects with a given reason
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
      this.#onFulfilledHandlers = [];
      this.#onRejectedHandlers = [];
  
      try {
        this.#resolve(func, this.#fulfill.bind(this), this.#reject.bind(this));
      } catch (error) {
        this.#reject(error);
      }
    }
  
    // 2.3
    #handleResolution(promise, x, resolve, reject) { 
      // 2.3.1
      if (promise === x) {
        reject(new TypeError('Chaining cycle detected for promise'));
        return;
      }
  
      if (x && (typeof x === 'object' || typeof x === 'function')) {
        let thenCalled = false;
  
        try {
          // 2.3.3.1
          const then = x.then;
  
          // 2.3.3.3
          if (typeof then === 'function') {
            then.call(
              x,
              (y) => {
                // 2.3.3.3.3
                if (thenCalled) return;
                thenCalled = true;
                // 2.3.3.3.1
                this.#handleResolution(promise, y, resolve, reject);
              },
              (r) => {
                // 2.3.3.3.3
                if (thenCalled) return;
                thenCalled = true;
                // 2.3.3.3.2
                reject(r);
              }
            );
            return;
          }
         // 2.3.3.2, 2.3.3.3.4
        } catch (error) {
          // 2.3.3.3.4.1
          if (thenCalled) return;
          // for an async resolvePromise/rejectPromise invocation
          thenCalled = true;
          // 2.3.3.3.4.2
          reject(error);

          return;
        }
      }
  
      resolve(x);
    }
  
    #fulfill(value) {
      // 2.1.2, 2.1.3
      if (this.#state !== 'pending') return;

      this.#value = value;
      this.#state = 'fulfilled';
      
      // 2.2.4
      setTimeout(() => {
        // 2.2.6.1
        this.#onFulfilledHandlers.forEach((fn) => fn());
      }, 0);
    }
  
    #reject(reason) {
      // 2.1.2, 2.1.3
      if (this.#state !== 'pending') return;
      
      this.#value = reason;
      this.#state = 'rejected';
      
      // 2.2.4
      setTimeout(() => {
        // 2.2.6.2
        this.#onRejectedHandlers.forEach((fn) => fn());
      }, 0);
    }
   
    #resolve(fn, onFulfilled, onRejected) {
      fn(
        (value) => {
          this.#handleResolution(this, value, onFulfilled, onRejected)
        },
        (reason) => {
          onRejected(reason);
        }
    );
  }
  
    #callCallback(value, callback, resolve, reject) {
      try {     
        // 2.2.5           
        const result = callback(value);
        // 2.2.7.1
        resolve(result);
      } catch (error) {
        // 2.2.7.2
        reject(error);
      }
    }
  
    /**
     * If the passed argument is a function, it will be called asynchronously when the current `MyPromise` is settled.
     * 
     * Subscribe to given `MyPromise` instance
     * and register 2 callbacks:
     * `onFulfilled` and `onRejected`
     * 
     * `onFulfilled(value)` takes the fulfilled value as a parameter from subscribed `MyPromise`.  Its return value becomes the fulfillment value of the promise returned by `then()`.
     * 
     * `onRejected(reason)` takes the rejected reason as a parameter from subscribed `MyPromise`.  Its return value becomes the fulfillment value of the promise returned by `then()`.
     * 
     * It immediately returns an equivalent `MyPromise` object, allowing you to chain
     * calls to other `MyPromise` methods. This new promise is always pending when returned, regardless of the current promise's status.
     * 
     * @example
     * 
     * then(onFulfilled)
     * then(onFulfilled, onRejected)
     * then(undefined, onRejected)
     * then(undefined, undefined)
     *
     * then(
     *  (value) => { fulfillment handler },
     *  (reason) => { rejection handler },
     * )
     * @param {Function | Any} onFulfilled
     * @param {Function | Any} onRejected
     * @return {MyPromise}
     */
    // 2.2
    then(onFulfilled, onRejected) {
      // 2.2.1.1, 2.2.7.3
      onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (x) => x;
      // 2.2.1.2, 2.2.7.4
      onRejected = typeof onRejected === 'function' ? onRejected : (r) => {throw r};
      // 2.2.7
      return new MyPromise((resolve, reject) => {
        if (this.#state === 'pending') {
          // 2.2.2
          this.#onFulfilledHandlers.push(() => {
              this.#callCallback(this.#value, onFulfilled, resolve, reject);
          });
          // 2.2.3
          this.#onRejectedHandlers.push(() => {
            this.#callCallback(this.#value, onRejected, resolve, reject);
          });
        }
  
        if (this.#state === 'fulfilled') {
          // 2.2.4
          setTimeout(() => {
            this.#callCallback(this.#value, onFulfilled, resolve, reject);
          }, 0);
        }
        
        if (this.#state === 'rejected') {
          // 2.2.4
          setTimeout(() => {
            this.#callCallback(this.#value, onRejected, resolve, reject);
          }, 0);
        }
      });
    }
  
    /**
     * Syntactic sugar for .then(undefined, reject)
     * 
     * @param {Function} onRejected
     * @returns {MyPromise} 
     */
    catch(onRejected) {
      return this.then(undefined, onRejected);
    }
  };