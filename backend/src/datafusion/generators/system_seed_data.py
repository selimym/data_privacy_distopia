"""Seed data for System Mode expansion - neighborhoods and news channels."""


def get_neighborhood_seed_data() -> list[dict]:
    """
    Return neighborhood seed data for the game map.

    Map is 50x50 tiles. Neighborhoods are defined with center points and boundaries
    for camera positioning during ICE raids and protests.
    """
    return [
        {
            "name": "Medical Quarter",
            "description": "Hospital district with medical facilities and staff housing",
            "center_x": 25,
            "center_y": 25,
            "bounds_min_x": 15,
            "bounds_min_y": 15,
            "bounds_max_x": 35,
            "bounds_max_y": 35,
            "population_estimate": 2500,
            "primary_demographics": ["healthcare workers", "patients", "medical students"],
        },
        {
            "name": "Riverside District",
            "description": "Residential area along the river, mixed income housing",
            "center_x": 10,
            "center_y": 25,
            "bounds_min_x": 0,
            "bounds_min_y": 15,
            "bounds_max_x": 20,
            "bounds_max_y": 35,
            "population_estimate": 3200,
            "primary_demographics": ["families", "young professionals", "retirees"],
        },
        {
            "name": "Downtown Core",
            "description": "Commercial and business district, high foot traffic",
            "center_x": 40,
            "center_y": 25,
            "bounds_min_x": 30,
            "bounds_min_y": 15,
            "bounds_max_x": 49,
            "bounds_max_y": 35,
            "population_estimate": 1800,
            "primary_demographics": ["office workers", "retail workers", "commuters"],
        },
        {
            "name": "North Heights",
            "description": "Affluent residential neighborhood with larger properties",
            "center_x": 25,
            "center_y": 10,
            "bounds_min_x": 15,
            "bounds_min_y": 0,
            "bounds_max_x": 35,
            "bounds_max_y": 20,
            "population_estimate": 1200,
            "primary_demographics": ["high-income families", "business owners", "professionals"],
        },
        {
            "name": "South End",
            "description": "Working-class neighborhood with dense apartment buildings",
            "center_x": 25,
            "center_y": 40,
            "bounds_min_x": 15,
            "bounds_min_y": 30,
            "bounds_max_x": 35,
            "bounds_max_y": 49,
            "population_estimate": 4500,
            "primary_demographics": ["working families", "immigrants", "service workers"],
        },
        {
            "name": "Eastside Industrial",
            "description": "Industrial zone with warehouses and factories",
            "center_x": 45,
            "center_y": 10,
            "bounds_min_x": 35,
            "bounds_min_y": 0,
            "bounds_max_x": 49,
            "bounds_max_y": 20,
            "population_estimate": 800,
            "primary_demographics": ["factory workers", "warehouse workers", "truckers"],
        },
        {
            "name": "Westside Park",
            "description": "Green space with surrounding residential areas",
            "center_x": 5,
            "center_y": 10,
            "bounds_min_x": 0,
            "bounds_min_y": 0,
            "bounds_max_x": 15,
            "bounds_max_y": 20,
            "population_estimate": 1500,
            "primary_demographics": ["families with children", "students", "artists"],
        },
        {
            "name": "University District",
            "description": "College campus and student housing",
            "center_x": 5,
            "center_y": 40,
            "bounds_min_x": 0,
            "bounds_min_y": 30,
            "bounds_max_x": 15,
            "bounds_max_y": 49,
            "population_estimate": 3500,
            "primary_demographics": ["students", "professors", "young adults"],
        },
    ]


def get_news_channel_seed_data() -> list[dict]:
    """
    Return news channel seed data.

    Channels have different stances (critical, independent, state_friendly)
    which affect article generation probability and Streisand effect outcomes.
    """
    return [
        {
            "name": "Independent Observer",
            "stance": "critical",
            "credibility": 85,
            "is_banned": False,
            "reporters": [
                {
                    "name": "Sarah Chen",
                    "specialty": "human_rights",
                    "fired": False,
                    "targeted": False,
                },
                {
                    "name": "Marcus Williams",
                    "specialty": "investigative",
                    "fired": False,
                    "targeted": False,
                },
                {
                    "name": "Elena Rodriguez",
                    "specialty": "immigration",
                    "fired": False,
                    "targeted": False,
                },
            ],
        },
        {
            "name": "City Times",
            "stance": "independent",
            "credibility": 75,
            "is_banned": False,
            "reporters": [
                {
                    "name": "James Patterson",
                    "specialty": "local_news",
                    "fired": False,
                    "targeted": False,
                },
                {
                    "name": "Linda Nguyen",
                    "specialty": "politics",
                    "fired": False,
                    "targeted": False,
                },
            ],
        },
        {
            "name": "National Herald",
            "stance": "state_friendly",
            "credibility": 50,
            "is_banned": False,
            "reporters": [
                {
                    "name": "Robert Thompson",
                    "specialty": "government",
                    "fired": False,
                    "targeted": False,
                },
                {
                    "name": "Michelle Davis",
                    "specialty": "security",
                    "fired": False,
                    "targeted": False,
                },
            ],
        },
        {
            "name": "Freedom Watch",
            "stance": "critical",
            "credibility": 90,
            "is_banned": False,
            "reporters": [
                {
                    "name": "Alexandra Moore",
                    "specialty": "civil_liberties",
                    "fired": False,
                    "targeted": False,
                },
                {
                    "name": "David Kim",
                    "specialty": "surveillance",
                    "fired": False,
                    "targeted": False,
                },
                {
                    "name": "Fatima Hassan",
                    "specialty": "whistleblowers",
                    "fired": False,
                    "targeted": False,
                },
            ],
        },
        {
            "name": "Metro Daily",
            "stance": "independent",
            "credibility": 70,
            "is_banned": False,
            "reporters": [
                {
                    "name": "Kevin O'Brien",
                    "specialty": "crime",
                    "fired": False,
                    "targeted": False,
                },
            ],
        },
    ]
