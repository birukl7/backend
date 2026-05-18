<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\QuizQuestion;
use App\Models\QuizOption;
use Illuminate\Database\Seeder;

class QuizSeeder extends Seeder
{
    public function run(): void
    {
        $quizzes = [
            [
                'title' => 'PHP Fundamentals',
                'description' => 'Test your knowledge of PHP syntax and core concepts.',
                'skill_name' => 'PHP',
                'category' => 'backend',
                'difficulty' => 'beginner',
                'time_limit_minutes' => 10,
                'pass_score' => 70,
                'questions' => [
                    [
                        'question' => 'Which symbol is used to declare a variable in PHP?',
                        'explanation' => 'In PHP, all variable names must start with the dollar sign ($).',
                        'options' => [
                            ['option_text' => '#', 'is_correct' => false],
                            ['option_text' => '$', 'is_correct' => true],
                            ['option_text' => '@', 'is_correct' => false],
                            ['option_text' => '&', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What is the correct way to end a PHP statement?',
                        'explanation' => 'PHP statements end with a semicolon (;), similar to C-family languages.',
                        'options' => [
                            ['option_text' => '.', 'is_correct' => false],
                            ['option_text' => ':', 'is_correct' => false],
                            ['option_text' => ';', 'is_correct' => true],
                            ['option_text' => ',', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which PHP function returns the length of a string?',
                        'explanation' => 'strlen() returns the number of characters in a string.',
                        'options' => [
                            ['option_text' => 'len()', 'is_correct' => false],
                            ['option_text' => 'length()', 'is_correct' => false],
                            ['option_text' => 'strlen()', 'is_correct' => true],
                            ['option_text' => 'count()', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'How do you create an associative array in PHP?',
                        'explanation' => 'PHP uses the => operator to map keys to values in associative arrays.',
                        'options' => [
                            ['option_text' => '["key" = "value"]', 'is_correct' => false],
                            ['option_text' => '["key" => "value"]', 'is_correct' => true],
                            ['option_text' => '{key: value}', 'is_correct' => false],
                            ['option_text' => '(key, value)', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which operator concatenates strings in PHP?',
                        'explanation' => 'The dot (.) operator is used for string concatenation in PHP.',
                        'options' => [
                            ['option_text' => '+', 'is_correct' => false],
                            ['option_text' => '&', 'is_correct' => false],
                            ['option_text' => '.', 'is_correct' => true],
                            ['option_text' => '~', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does isset($var) return if $var is not defined?',
                        'explanation' => 'isset() returns false when the variable is not set or is set to null.',
                        'options' => [
                            ['option_text' => 'null', 'is_correct' => false],
                            ['option_text' => '0', 'is_correct' => false],
                            ['option_text' => 'false', 'is_correct' => true],
                            ['option_text' => '""', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which function removes whitespace from both ends of a string?',
                        'explanation' => 'trim() strips whitespace (and other characters) from the beginning and end of a string.',
                        'options' => [
                            ['option_text' => 'strip()', 'is_correct' => false],
                            ['option_text' => 'clean()', 'is_correct' => false],
                            ['option_text' => 'trim()', 'is_correct' => true],
                            ['option_text' => 'clear()', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'How do you include another PHP file so it causes a fatal error if missing?',
                        'explanation' => 'require includes a file and throws a fatal error if the file is not found, unlike include.',
                        'options' => [
                            ['option_text' => 'import(\'file.php\')', 'is_correct' => false],
                            ['option_text' => 'include \'file.php\';', 'is_correct' => false],
                            ['option_text' => 'require \'file.php\';', 'is_correct' => true],
                            ['option_text' => 'use \'file.php\';', 'is_correct' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'JavaScript Essentials',
                'description' => 'Challenge your understanding of core JavaScript concepts and behaviour.',
                'skill_name' => 'JavaScript',
                'category' => 'frontend',
                'difficulty' => 'intermediate',
                'time_limit_minutes' => 12,
                'pass_score' => 70,
                'questions' => [
                    [
                        'question' => 'What does typeof null return in JavaScript?',
                        'explanation' => 'This is a well-known quirk of JavaScript — typeof null returns "object" due to a legacy bug.',
                        'options' => [
                            ['option_text' => '"null"', 'is_correct' => false],
                            ['option_text' => '"undefined"', 'is_correct' => false],
                            ['option_text' => '"object"', 'is_correct' => true],
                            ['option_text' => '"NaN"', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which array method creates a new array by applying a function to every element?',
                        'explanation' => 'map() transforms each element and returns a new array of the same length.',
                        'options' => [
                            ['option_text' => 'forEach()', 'is_correct' => false],
                            ['option_text' => 'filter()', 'is_correct' => false],
                            ['option_text' => 'map()', 'is_correct' => true],
                            ['option_text' => 'reduce()', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What is the difference between == and === in JavaScript?',
                        'explanation' => '=== checks both value AND type (strict equality), while == does type coercion before comparing.',
                        'options' => [
                            ['option_text' => 'No difference', 'is_correct' => false],
                            ['option_text' => '=== checks value and type (strict)', 'is_correct' => true],
                            ['option_text' => '== is faster', 'is_correct' => false],
                            ['option_text' => '=== only works with numbers', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which keyword declares a variable with block scope that CAN be reassigned?',
                        'explanation' => 'let has block scope and allows reassignment, unlike const which is also block-scoped but immutable.',
                        'options' => [
                            ['option_text' => 'var', 'is_correct' => false],
                            ['option_text' => 'let', 'is_correct' => true],
                            ['option_text' => 'const', 'is_correct' => false],
                            ['option_text' => 'def', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What is a closure in JavaScript?',
                        'explanation' => 'A closure is a function that retains access to variables from its outer (enclosing) scope even after that scope has finished executing.',
                        'options' => [
                            ['option_text' => 'A way to end a loop', 'is_correct' => false],
                            ['option_text' => 'A function that captures its outer scope variables', 'is_correct' => true],
                            ['option_text' => 'A method to close a file', 'is_correct' => false],
                            ['option_text' => 'A promise rejection handler', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does the spread operator (...) do when used with an array?',
                        'explanation' => 'The spread operator expands an iterable (like an array) into individual elements.',
                        'options' => [
                            ['option_text' => 'Multiplies all array values', 'is_correct' => false],
                            ['option_text' => 'Expands an iterable into individual elements', 'is_correct' => true],
                            ['option_text' => 'Creates a deep copy of a function', 'is_correct' => false],
                            ['option_text' => 'Merges two objects by reference', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which statement correctly describes a JavaScript Promise?',
                        'explanation' => 'A Promise represents the eventual result of an asynchronous operation — it can be pending, fulfilled, or rejected.',
                        'options' => [
                            ['option_text' => 'A synchronous blocking operation', 'is_correct' => false],
                            ['option_text' => 'An object representing the future result of an async operation', 'is_correct' => true],
                            ['option_text' => 'A type of for-loop', 'is_correct' => false],
                            ['option_text' => 'A way to declare global variables', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What is the output of: console.log(0.1 + 0.2 === 0.3)?',
                        'explanation' => 'Due to floating-point precision, 0.1 + 0.2 is actually 0.30000000000000004, so === 0.3 is false.',
                        'options' => [
                            ['option_text' => 'true', 'is_correct' => false],
                            ['option_text' => 'false', 'is_correct' => true],
                            ['option_text' => 'NaN', 'is_correct' => false],
                            ['option_text' => 'undefined', 'is_correct' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'SQL Basics',
                'description' => 'Assess your knowledge of SQL queries and database fundamentals.',
                'skill_name' => 'SQL',
                'category' => 'database',
                'difficulty' => 'beginner',
                'time_limit_minutes' => 10,
                'pass_score' => 70,
                'questions' => [
                    [
                        'question' => 'Which SQL keyword retrieves data from a table?',
                        'explanation' => 'SELECT is the fundamental SQL command for querying data.',
                        'options' => [
                            ['option_text' => 'FETCH', 'is_correct' => false],
                            ['option_text' => 'GET', 'is_correct' => false],
                            ['option_text' => 'SELECT', 'is_correct' => true],
                            ['option_text' => 'RETRIEVE', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does the WHERE clause do in SQL?',
                        'explanation' => 'WHERE filters rows based on a condition before returning results.',
                        'options' => [
                            ['option_text' => 'Sorts the result set', 'is_correct' => false],
                            ['option_text' => 'Groups rows together', 'is_correct' => false],
                            ['option_text' => 'Filters rows based on a condition', 'is_correct' => true],
                            ['option_text' => 'Joins two tables', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which SQL function counts the number of rows?',
                        'explanation' => 'COUNT() is an aggregate function that counts the number of rows or non-null values.',
                        'options' => [
                            ['option_text' => 'SUM()', 'is_correct' => false],
                            ['option_text' => 'COUNT()', 'is_correct' => true],
                            ['option_text' => 'TOTAL()', 'is_correct' => false],
                            ['option_text' => 'NUM()', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'How do you sort results in descending order?',
                        'explanation' => 'ORDER BY col DESC sorts the result set from highest to lowest.',
                        'options' => [
                            ['option_text' => 'ORDER BY col ASC', 'is_correct' => false],
                            ['option_text' => 'SORT BY col DESC', 'is_correct' => false],
                            ['option_text' => 'ORDER BY col DESC', 'is_correct' => true],
                            ['option_text' => 'GROUP BY col DESC', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which SQL command inserts a new row into a table?',
                        'explanation' => 'INSERT INTO is used to add new records to a table.',
                        'options' => [
                            ['option_text' => 'ADD ROW', 'is_correct' => false],
                            ['option_text' => 'INSERT INTO', 'is_correct' => true],
                            ['option_text' => 'CREATE ROW', 'is_correct' => false],
                            ['option_text' => 'PUT INTO', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does JOIN do in SQL?',
                        'explanation' => 'JOIN combines rows from two or more tables based on a related column.',
                        'options' => [
                            ['option_text' => 'Adds a new column', 'is_correct' => false],
                            ['option_text' => 'Combines rows from two or more tables', 'is_correct' => true],
                            ['option_text' => 'Creates a copy of a table', 'is_correct' => false],
                            ['option_text' => 'Removes duplicate rows', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which clause filters data AFTER grouping?',
                        'explanation' => 'HAVING filters groups created by GROUP BY, while WHERE filters individual rows before grouping.',
                        'options' => [
                            ['option_text' => 'WHERE', 'is_correct' => false],
                            ['option_text' => 'FILTER', 'is_correct' => false],
                            ['option_text' => 'HAVING', 'is_correct' => true],
                            ['option_text' => 'WHEN', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does DISTINCT do in a SELECT statement?',
                        'explanation' => 'DISTINCT eliminates duplicate rows from the result set.',
                        'options' => [
                            ['option_text' => 'Sorts the results', 'is_correct' => false],
                            ['option_text' => 'Counts the rows', 'is_correct' => false],
                            ['option_text' => 'Removes duplicate values', 'is_correct' => true],
                            ['option_text' => 'Limits the number of results', 'is_correct' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Python Basics',
                'description' => 'Test your foundational knowledge of Python programming.',
                'skill_name' => 'Python',
                'category' => 'backend',
                'difficulty' => 'beginner',
                'time_limit_minutes' => 10,
                'pass_score' => 70,
                'questions' => [
                    [
                        'question' => 'How do you print text to the console in Python 3?',
                        'explanation' => 'In Python 3, print is a function and must be called with parentheses.',
                        'options' => [
                            ['option_text' => 'print text', 'is_correct' => false],
                            ['option_text' => 'echo(text)', 'is_correct' => false],
                            ['option_text' => 'print(text)', 'is_correct' => true],
                            ['option_text' => 'console.log(text)', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which data type represents an ordered, mutable sequence in Python?',
                        'explanation' => 'A list [] is ordered and mutable. Tuples are ordered but immutable; sets are unordered.',
                        'options' => [
                            ['option_text' => 'tuple', 'is_correct' => false],
                            ['option_text' => 'set', 'is_correct' => false],
                            ['option_text' => 'list', 'is_correct' => true],
                            ['option_text' => 'dict', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'How do you define a function in Python?',
                        'explanation' => 'The def keyword is used to define a function in Python.',
                        'options' => [
                            ['option_text' => 'function name():', 'is_correct' => false],
                            ['option_text' => 'def name():', 'is_correct' => true],
                            ['option_text' => 'fn name():', 'is_correct' => false],
                            ['option_text' => 'func name():', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does len([1, 2, 3, 4]) return?',
                        'explanation' => 'len() returns the number of items in an object. The list has 4 items.',
                        'options' => [
                            ['option_text' => '3', 'is_correct' => false],
                            ['option_text' => '4', 'is_correct' => true],
                            ['option_text' => '5', 'is_correct' => false],
                            ['option_text' => '0', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does range(5) produce?',
                        'explanation' => 'range(5) generates 0, 1, 2, 3, 4 — starting from 0, up to but not including 5.',
                        'options' => [
                            ['option_text' => '[1, 2, 3, 4, 5]', 'is_correct' => false],
                            ['option_text' => '[0, 1, 2, 3, 4]', 'is_correct' => true],
                            ['option_text' => '[1, 2, 3, 4]', 'is_correct' => false],
                            ['option_text' => '[0, 5]', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'How do you create a dictionary in Python?',
                        'explanation' => 'Dictionaries use curly braces with key: value pairs.',
                        'options' => [
                            ['option_text' => '[key: value]', 'is_correct' => false],
                            ['option_text' => '(key: value)', 'is_correct' => false],
                            ['option_text' => '{key: value}', 'is_correct' => true],
                            ['option_text' => '<key: value>', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'Which symbol starts a single-line comment in Python?',
                        'explanation' => 'The hash (#) symbol starts a comment in Python.',
                        'options' => [
                            ['option_text' => '//', 'is_correct' => false],
                            ['option_text' => '/*', 'is_correct' => false],
                            ['option_text' => '#', 'is_correct' => true],
                            ['option_text' => '--', 'is_correct' => false],
                        ],
                    ],
                    [
                        'question' => 'What does the "in" operator do in Python?',
                        'explanation' => '"in" checks if a value exists in a sequence (list, tuple, string, dict keys, etc.).',
                        'options' => [
                            ['option_text' => 'Imports a module', 'is_correct' => false],
                            ['option_text' => 'Declares an inner function', 'is_correct' => false],
                            ['option_text' => 'Checks if a value exists in a sequence', 'is_correct' => true],
                            ['option_text' => 'Compares two integers', 'is_correct' => false],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($quizzes as $quizData) {
            $questions = $quizData['questions'];
            unset($quizData['questions']);

            $assessment = Assessment::create($quizData);

            foreach ($questions as $sortQ => $qData) {
                $options = $qData['options'];
                unset($qData['options']);
                $qData['sort_order'] = $sortQ;
                $question = $assessment->questions()->create($qData);

                foreach ($options as $sortO => $optData) {
                    $optData['sort_order'] = $sortO;
                    $question->options()->create($optData);
                }
            }
        }
    }
}
