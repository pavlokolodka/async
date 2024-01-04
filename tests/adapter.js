const MyPromise = require('../promise');

module.exports = {
    deferred: function() {
        let resolve, reject;
        return {
            promise: new MyPromise(function (res, rej) {
                resolve = res;
                reject = rej;
            }),
            // resolve: function (value) {return new MyPromise((res, rej) => res(value))},
            resolve: resolve,
            // reject: function (reason) {return new MyPromise((res, rej) => rej(reason))}
            reject: reject
        };
    }
};
// 160/59