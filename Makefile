fluentd:
	docker run -d -p 24224:24224 --name fluentd -v $PWD/data:/fluentd/log fluent/fluentd
