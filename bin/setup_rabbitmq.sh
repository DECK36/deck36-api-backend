#!/bin/bash

wget http://127.0.0.1:15672/cli/rabbitmqadmin

chmod +x rabbitmqadmin

./rabbitmqadmin --port=15672 --host=127.0.0.1 declare exchange name=plan9 type=topic auto_delete=false durable=true
./rabbitmqadmin --port=15672 --host=127.0.0.1 declare exchange name=plan9-backchannel type=fanout auto_delete=false
durable=true