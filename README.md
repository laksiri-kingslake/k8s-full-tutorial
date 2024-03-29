# Kubernets
Ref: https://medium.com/p/508db74028ce

## Set up a Kubernetes Cluster with kubeadm

### Step 1. Disable Swap and bridge (Run it on MASTER & WORKER Nodes)

1. Disable swap
```
swapoff -a

sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

2. Bridge network
```
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay

sudo modprobe br_netfilter

# sysctl params required by setup, params persist across reboots
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl params without reboot
sudo sysctl --system

lsmod | grep br_netfilter

lsmod | grep overlay

sysctl net.bridge.bridge-nf-call-iptables net.bridge.bridge-nf-call-ip6tables net.ipv4.ip_forward
```

### Step 2. Install Docker (Run it on MASTER & WORKER Nodes)
Ref: https://docs.docker.com/engine/install/ubuntu/

1. Install
```
# This is old method - no need any longer
# sudo apt-get update
# sudo apt install docker.io
# sudo systemctl start docker

for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove $pkg; done

sudo apt-get update

sudo apt-get install ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# If you use an Ubuntu derivative distro, such as Linux Mint, you may need to use UBUNTU_CODENAME instead of VERSION_CODENAME.

sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo docker run hello-world

# Manage Docker as a Non-root User (Optional): If you want to run Docker commands without using sudo, add your user to the docker group:
# sudo usermod -aG docker ${USER}

sudo usermod -a -G docker ubuntu

id ubuntu

newgrp docker
```

2. Setting up the Docker daemon 
```
cat <<EOF | sudo tee /etc/docker/daemon.json
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2"
}
EOF
```

3. Reload, enable and restart the docker service 
```
sudo systemctl daemon-reload

sudo systemctl enable docker

sudo systemctl restart docker

sudo systemctl status docker
```

### Step 3. Install kubeadm, kubelet, and kubectl (Run it on MASTER & WORKER Nodes)
Ref: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/

```
sudo apt-get update

# apt-transport-https may be a dummy package; if so, you can skip that package
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

# If the directory `/etc/apt/keyrings` does not exist, it should be created before the curl command, read the note below.
# sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# This overwrites any existing configuration in /etc/apt/sources.list.d/kubernetes.list
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update

sudo apt-get install -y kubelet kubeadm kubectl

sudo apt-mark hold kubelet kubeadm kubectl

sudo systemctl enable --now kubelet

# Start and enable Kubelet
sudo systemctl daemon-reload

sudo systemctl enable kubelet

sudo systemctl restart kubelet

sudo systemctl status kubelet
```

### Step 4. Initializing CONTROL-PLANE (Run it on MASTER Node only)

1. Init - kubeadm init
```
sudo kubeadm init --pod-network-cidr 10.0.0.0/16

# if above gives an error (container runtime not working)
sudo rm /etc/containerd/config.toml
sudo systemctl restart containerd
sudo kubeadm init # sudo kubeadm init --pod-network-cidr 10.0.0.0/16

# Copy the token (full join command) in to your notepad, we will need to join worker/slave to the master node.

# kubeadm join 172.31.45.202:6443 --token mzfw5u.61j2x1se8wq4zotq \
         --discovery-token-ca-cert-hash sha256:3dc41941dcd519ea376fabd45aa3850261bb70dca1445f9c8c87c7d1c43df749
```

2. Create new ‘.kube’ configuration directory and copy the configuration ‘admin.conf’ from ‘/etc/kubernetes’ directory.
```
mkdir -p $HOME/.kube

sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### Step 5. Installing POD-NETWORK add-on (Run it on MASTER Node only)
Ref: https://stackoverflow.com/questions/76673312/kubernates-install-unable-to-connect-to-the-server-dial-tcp-lookup-cloud-weave

```
kubectl apply -f https://github.com/weaveworks/weave/releases/download/v2.8.1/weave-daemonset-k8s-1.11.yaml
```

### Step 6. Next Join two worker nodes to master (Run it on both worker nodes)
Paste the Join command from the above kubeadm init output
```
# eg.
kubeadm join 172.31.45.202:6443 --token mzfw5u.61j2x1se8wq4zotq \
         --discovery-token-ca-cert-hash sha256:3dc41941dcd519ea376fabd45aa3850261bb70dca1445f9c8c87c7d1c43df749

# Run the following in master node if join command is not available
kubeadm token create — print-join-command

# To check joined worker nodes
kubectl get nodes -o wide
```

### Step 7. Test

1. Create dev directory
```
mkdir node-simple
cd node-simple
mkdir kube
cd kube
vi k8s-01.yaml
```

2. Paste contents of the service and deployment
```
apiVersion: v1
kind: Service
metadata:
  name: k8s-01
spec:
  selector:
    app: k8s-01
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-01
spec:
  replicas: 1
  selector:
    matchLabels:
      app: k8s-01 
  template:
    metadata:
      labels:
        app: k8s-01
    spec:
      containers:
        - name: k8s-01
          image: laksiriben/k8s-test-01:1.0.1
          ports:
            - containerPort: 3000
          imagePullPolicy: Always
```

3. Save, exit and deploy
```
cd ..
kubectl apply -f kube

kubectl port-forward service/k8s-01 7080:80
# browse http://127.0.0.1:7080

# To access from outside
kubectl port-forward service/k8s-01 7080:80 --address 0.0.0.0
# browse http://<external-ip>:7080

kubectl scale --replicas=2 deployment/k8s-01
```

4. Undeploy
```
kubectl delete -f kube
```

## Reference
- https://medium.com/p/1feafa6edb50
- https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- https://stackoverflow.com/questions/76673312/kubernates-install-unable-to-connect-to-the-server-dial-tcp-lookup-cloud-weave
- https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- https://docs.docker.com/engine/install/ubuntu/
- https://www.reddit.com/r/kubernetes/comments/utiymt/kubeadm_init_running_into_issue_error_cri/
- https://spacelift.io/blog/kubectl-port-forward