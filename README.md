# omega
Be lazy in js!

basic:
   a = ${3}        | constant
   b = f a         | application
   g a = b         | abstraction
   id = $identity  | identity operator
   ! = $reduce     | reduce operator
   ^! = $parallel  | parallel operator
   x = _           | forgetful (unable to bind, interrupt when evaluating)
   _x = ${2}       | dummy (forget after parse)

examples:
   0 f = a : a                       |  zero  ( == becomes identity )
   1 f = a : f a                     |  one   ( == identity )
   2 f = a : f ( f a )               |  two
   3 f = a : f ( f ( f a ) )         |  three

   | _____ flatten definitions ______
   0 f = 1                           |  zero
   1 f = f                           |  one
   2 f = f^2                         |  two
   3 f = f^3                         |  three
   oo f = f*                         |  infinity
   fa = f a
   f^2 a = f^2a
   f^2a = f fa
   f^3 a = f^3a
   f^3a = f^2 fa
   f* a = f*a
   f*a = f* fa

   | ____ recursion definitions _____
   1 f = a : 0 f ( f a )             |  one
   2 f = a : 1 f ( f a )             |  two
   3 f = a : 2 f ( f a )             |  three
   ${n} f = a : ${n-1} f ( f a )     |  n
   oo f = a : oo f ( f a )           |  infinity

   | _______ strict version _________
   0! f = a : a                      |  zero! == zero
   1! f = a : f a                    |  one! == one
   2! f = a : f !( f a )             |  two!
   3! f = a : f !( f !( f a ) )      |  three!
   ${n}! f = a : ${n-1}! f !( f a )  |  n!
   oo! f = a : oo! f !( f a )        |  infinity! (infinity loop)

