# original alphabet = '123456789bcdfghijklmnopqrstuvwxyzBCDFGHJKLMNPQRSTUVWXYZ'
# randomized with: ''.join(random.sample(alphabet, len(alphabet)))

# im not a fan of case-sensitive urls, but a couple of popular url shortener services do this, so i think it's ok
# youtube, cl.ly, goo.gl
ALPHABET_RANDOMIZED = 'JFZyW1r7f0Pja3ks5B9CVeTNtlxGmgwMpDbYR42cK8n6qXdhHSLQvz_'
# ALPHABET_RANDOMIZED = 'g879mnt6vshj3wl4xyd2fpr1cqk5bz'


"""
This is meant to deal with proper 12-byte ObjectId hashes
NOTE: be careful with numbers starting or ending with zero, specially if reversing and parsing them
"""


def encode(hex_string):
    """a hex string"""

    base10_value = int(hex_string, 16)
    alphabet_len = len(ALPHABET_RANDOMIZED)

    encoded = ''
    while (base10_value > 0):
        encoded += ALPHABET_RANDOMIZED[base10_value % alphabet_len]
        base10_value /= alphabet_len

    # this is safe because we are treating encoded as a string
    # and there is no chance of a leading zero getting removed due to parsing as an int
    encoded = encoded[::-1]

    return encoded


def decode(encoded):
    """returns a hex string"""

    alphabet_length = len(ALPHABET_RANDOMIZED)
    decoded = 0

    encoded = encoded[::-1]

    for i in range(len(encoded)):
        decoded += ALPHABET_RANDOMIZED.index(encoded[i]) * (alphabet_length ** i)

    hash = str(format(decoded, 'x'))

    return hash


def perf_test():
    numOfItems = 10000
    start = 25742615863843122151790442836
    encodes = []
    import random

    for i in range(numOfItems):
        rnd = random.randint(1, 25742615863843122151790442836)
        value = start + rnd
        str = format(value, 'x')

        encoded = encode(str)
        decoded = decode(encoded)

        print "%s -> %s -> %s" % (str, encoded, decoded)

        if decoded != str:
            print "SANITY FAILURE: %s != %s" % (decoded, str)


if __name__ == '__main__':
    perf_test()
