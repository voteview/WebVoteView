""" Helper methods for returning slides for the slide carousel. """

import json
import os
from numpy.random import choice
from model.config import config


def generate_slides(num_slides=5):
    """ Returns a set of slides to the user.  """
    weights = [x["weight"] for x in config["slides"]]
    sum_weights = sum(weights)
    weights = [w / float(sum_weights) for w in weights]
    slides = choice(config["slides"], num_slides, replace=False, p=weights)
    return slides
