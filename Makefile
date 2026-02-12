
build:
	docker buildx build -t tikvadmin:latest --platform linux/amd64  .
	docker save -o tikvadmin.tar tikvadmin:latest

buildlocal:
	docker build -t tikvadmin:latest .


runlocal: 
	docker run -d -p 3002:3002 --name tikvadmin tikvadmin:latest


clean:
	docker stop tikvadmin
	docker rm tikvadmin
	docker rmi -f tikvadmin:latest
