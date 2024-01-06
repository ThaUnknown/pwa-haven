import URLFile from '@thaunknown/url-file'
import 'fast-readable-async-iterator'

// way too lazy to implement this on each file the browser creates
URLFile.prototype.onIterator = File.prototype.onIterator = () => {}

File.prototype[Symbol.asyncIterator] = URLFile.prototype[Symbol.asyncIterator] = function (opts = {}) {
  return (opts ? this.slice(opts.start) : this).stream()[Symbol.asyncIterator]()
}
