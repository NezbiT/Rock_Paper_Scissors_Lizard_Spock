#!/usr/bin/python
# -*- utf-8 -*-
import random
import time

optionMachine = random.randint(1,5)
option={'rock':1,'paper':2, 'scissors':3, 'lizard':4, 'spock':5}
print ('''Write the number or name:
	rock     = 1
	paper    = 2
	scissors = 3
	lizard   = 4
	spock    = 5''')
optionUser = int(input('What you Choose:'))

if(optionUser == optionMachine):
	print('Draw')
else:
	if(optionUser == option['rock']):
		if(optionMachine == option['paper']):
			print ('You lost') 
		elif(optionMachine == option['scissors']):
			print ('You Win!')
		elif(optionMachine == option['lizard']):
			print('You Win!')
		elif(optionMachine == option['spock']):
			print ('You lost')

	elif(optionUser == option['paper']):
		if(optionMachine == option['rock']):
			print ('You Win!') 
		elif(optionMachine == option['scissors']):
			print ('You lost')
		elif(optionMachine == option['lizard']):
			print('You lost')
		elif(optionMachine == option['spock']):
			print ('You Win!')

	elif(optionUser == option['scissors']):
		if(optionMachine == option['rock']):
			print ('You lost') 
		elif(optionMachine == option['paper']):
			print ('You Win!')
		elif(optionMachine == option['lizard']):
			print('You Win!')
		elif(optionMachine == option['spock']):
			print ('You lost')

	elif(optionUser == option['lizard']):
		if(optionMachine == option['rock']):
			print ('You lost') 
		elif(optionMachine == option['paper']):
			print ('You Win!')
		elif(optionMachine == option['scissors']):
			print('You lost')
		elif(optionMachine == option['spock']):
			print ('You Win!')

	elif(optionUser == option['spock']):
		if(optionMachine == option['rock']):
			print ('You Win!') 
		elif(optionMachine == option['paper']):
			print ('You lost')
		elif(optionMachine == option['scissors']):
			print('You Win!')
		elif(optionMachine == option['lizard']):
			print ('You lost')
time.sleep(3)