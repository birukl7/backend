<?php

use App\Support\PhpIniSize;

test('php ini size strings are parsed to bytes', function () {
    expect(PhpIniSize::toBytes('2M'))->toBe(2 * 1024 * 1024);
    expect(PhpIniSize::toBytes('512K'))->toBe(512 * 1024);
});
