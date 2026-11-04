# Browser-accessible XFCE desktop with KStars/Ekos. INDI drivers run on the host
# (indiwebmanager on :8624, indiserver on :7624); Ekos connects to them over localhost.
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

RUN apt-get update \
 && apt-get install -y --no-install-recommends software-properties-common gpg-agent \
 && add-apt-repository -y ppa:mutlaqja/ppa \
 && apt-get update \
 && apt-get install -y kstars-bleeding \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
