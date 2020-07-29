""" Helper methods for returning slides for the slide carousel. """

import json
import os
import numpy.random
from model.config import config


def generate_slides(num_slides=5):
    """ Returns a set of slides to the user.  """
    weights = [x["weight"] for x in config["slides"]]
    sum_weights = sum(weights)
    weights = [w / float(sum_weights) for w in weights]

    # Guard against not having enough slides
    num_slides = max(num_slides, len(weights))

    # Guard against having 0 slides.
    if weights and config["slides"]:
        slides = np.random.default_rng().choice(config["slides"], num_slides, replace=False, p=weights)
    else:
        slides = []

    return slides
