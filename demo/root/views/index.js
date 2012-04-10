exports.index = function(request, response, next) {
	request.title = 'Express';
	response.render('user/index.wc', { request : request, response : response, params : request.params });
}