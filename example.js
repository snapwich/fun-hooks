
let hook = require('./index.js')();

function sync(a, b) {
  return a + b;
}
function async(a , b, cb) {
  cb(a + b);
}

function before(cb, a, b) {
  cb(a, b);
}
function afterAsync(cb, a, b, c) {
  cb(a, b, c);
}
function afterSync(cb, a) {
  cb(a);
}

let hooked = hook('async', async);
hooked.before(before);
hooked.before(before);
hooked.before(before);
hooked.after(afterSync);
hooked.after(afterSync);
hooked.after(afterSync);
