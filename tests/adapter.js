const MyPromise = require('../promise');

module.exports = {
    deferred: function() {
        let resolve, reject;
        return {
            promise: new MyPromise(function (res, rej) {
                resolve = res;
                reject = rej;
            }),
            resolve: resolve,
            reject: reject
        };
    }
};

require('process').on('unhandledRejection', (err) => console.debug)
// 872