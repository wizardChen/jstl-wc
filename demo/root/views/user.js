var webUtil = require('jstl-wc/util').webUtil;

exports.index = webUtil.next('user/index.wc', function(request, response, next, session, params) {
	request.title = 'Express';
});