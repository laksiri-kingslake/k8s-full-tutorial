# Simple K8s Tryout

## Commands
```
docker build -t k8s-01 .

docker run --name=k8s --rm -d -p 3000:3000 -it k8s-01

docker stop k8s

docker tag k8s-01 laksiriben/k8s-test-01:1.0.1

docker login

docker push laksiriben/k8s-test-01:1.0.1

docker run --name=k8s --rm -d -p 3000:3000 -it laksiriben/k8s-test-01:1.0.1

docker stop k8s

minikube start

minikube dashboard

kubectl apply -f kube

kubectl port-forward service/k8s-01 7080:80
# kubectl port-forward service/k8s-01 7080:80 --address 0.0.0.0
# browse http://127.0.0.1:7080

kubectl scale --replicas=2 deployment/k8s-01

kubectl delete -f kube

minikube stop


aws eks list-clusters --region=us-east-1

eksctl create cluster --region=ap-south-1 --name=k8s-01

aws eks list-clusters --region=ap-south-1

kubectl apply -f kube

kubectl get pods --watch

kubectl get service k8s-01

kubectl scale --replicas=2 deployment k8s-01

eksctl delete cluster --region=ap-south-1 --name=k8s-01

```